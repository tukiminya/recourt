import {
  case_reading_holds,
  case_documents,
  databaseTimeMs,
  db,
  and,
  eq,
  sql,
} from "@recourt/database";
import {
  heldJudgmentSource,
  caseListResult,
  judgmentText,
  readingTopicLabels,
  readingCase,
  readingTopic,
  type PreparedJudgment,
} from "@recourt/types";
import type { z } from "zod";
import { uuidv7 } from "@recourt/utils";
import { ConflictError, InternalServerError, NotFoundError } from "@recourt/utils/error";
import { createCasesRepository } from "./cases-repository";

const CLASSIFICATION_LEASE_MS = 15 * 60 * 1_000;
const CLASSIFICATION_INTERVAL_MS = 15 * 1_000;

const latest = sql`WITH ranked AS (
  SELECT d.*, row_number() OVER (PARTITION BY case_id ORDER BY created_at DESC, id DESC) AS rank
  FROM case_documents d WHERE status = 'ready'
), ready AS (
  SELECT * FROM ranked WHERE rank = 1
)`;

const publicFields = sql`d.case_id AS id, d.id AS "documentId", d.title, d.description,
  json_extract(d.source, '$.courtName') AS "courtName",
  json_extract(d.source, '$.caseNumber') AS "caseNumber",
  d.decision_date AS "decisionDate", json_extract(d.source, '$.detailUrl') AS "detailUrl",
  (SELECT json_group_array(json_object('id', t.id, 'label', t.label) ORDER BY t.label)
    FROM case_document_topics dt JOIN reading_topics t ON t.id = dt.topic_id
    WHERE dt.document_id = d.id) AS topics, d.page_count AS "pageCount"`;

function parseReadingCase(row: { topics: string }) {
  return readingCase.parse({ ...row, topics: JSON.parse(row.topics) });
}

export function createCaseReadingService(binding: D1Database, bucket: R2Bucket) {
  const database = db(binding);
  const repository = createCasesRepository(binding);

  async function documentRow(caseId: string, documentId: string) {
    const [row] = await database.all<{
      pdfKey: string;
      textKey: string | null;
      textSha256: string | null;
      topics: string;
    }>(sql`
      SELECT ${publicFields}, d.pdf_key AS "pdfKey", d.text_key AS "textKey", d.text_sha256 AS "textSha256"
      FROM case_documents d
      WHERE d.case_id = ${caseId} AND d.id = ${documentId} AND d.status = 'ready'
    `);
    if (!row) throw new NotFoundError("Document not found");
    return row;
  }

  return {
    async claimClassification(sha256: string, version: number, owner: string) {
      // D1 executes both statements atomically. Advance the gate only when the lease changed.
      const [lease] = await database.batch([
        database.run(sql`
          INSERT INTO case_classification_jobs (source_sha256, processing_version, owner, lease_until)
          SELECT ${sha256}, ${version}, ${owner}, ${databaseTimeMs} + ${CLASSIFICATION_LEASE_MS}
          WHERE NOT EXISTS (
            SELECT 1 FROM case_ai_gate WHERE id = 'classification' AND next_start > ${databaseTimeMs}
          )
          ON CONFLICT (source_sha256, processing_version) DO UPDATE
          SET owner = excluded.owner, lease_until = excluded.lease_until
          WHERE case_classification_jobs.lease_until < ${databaseTimeMs}
            OR case_classification_jobs.owner = excluded.owner
        `),
        database.run(sql`
          INSERT INTO case_ai_gate (id, next_start)
          SELECT 'classification', ${databaseTimeMs} + ${CLASSIFICATION_INTERVAL_MS} WHERE changes() = 1
          ON CONFLICT (id) DO UPDATE SET next_start = excluded.next_start
        `),
      ]);
      if (lease.meta.changes === 0)
        throw new ConflictError("Classification capacity is busy", "CLASSIFICATION_BUSY");
      return { claimed: true };
    },
    async holdSource(input: z.infer<typeof heldJudgmentSource>) {
      if (
        !input.source.documents.some(
          (document) => document.role === "full_text" && document.url === input.pdfUrl,
        )
      )
        throw new InternalServerError("PDF must match source metadata");
      const { caseId } = await repository.ensureCase(uuidv7(), input.courtCaseId);
      await database
        .insert(case_reading_holds)
        .values({
          case_id: caseId,
          pdf_url: input.pdfUrl,
          source: input.source,
          reason: input.reason,
        })
        .onConflictDoUpdate({
          target: [case_reading_holds.case_id, case_reading_holds.pdf_url],
          set: { reason: input.reason, updated_at: new Date() },
        });
      return { caseId, status: "held" as const, reason: input.reason };
    },
    async register(input: PreparedJudgment) {
      const keyPrefix = `judgment/${input.sha256}/v${input.processingVersion}/`;
      if (
        input.pdfKey !== `${keyPrefix}source.pdf` ||
        (input.textKey !== null && input.textKey !== `${keyPrefix}text.json`)
      )
        throw new InternalServerError("Unexpected document storage key");
      if (!input.source.documents.some((document) => document.role === "full_text"))
        throw new InternalServerError("Source has no full judgment");
      const pdf = await bucket.head(input.pdfKey);
      if (!pdf || pdf.customMetadata?.sha256 !== input.sha256)
        throw new InternalServerError("Source PDF is missing or does not match its hash");
      if (input.status === "ready") {
        const object = await bucket.get(input.textKey!);
        if (!object || object.customMetadata?.sha256 !== input.textSha256)
          throw new InternalServerError("Judgment text is missing or does not match its hash");
        const serialized = await object.text();
        const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(serialized));
        if (
          Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join(
            "",
          ) !== input.textSha256
        )
          throw new InternalServerError("Judgment text content mismatch");
        const text = judgmentText.parse(JSON.parse(serialized));
        if (text.pages.length !== input.pageCount)
          throw new InternalServerError("Judgment page count mismatch");
      }
      const { caseId } = await repository.ensureCase(uuidv7(), input.courtCaseId);
      const documentId = uuidv7();
      const labels = JSON.stringify(readingTopicLabels(input.topics));
      const [[created]] = await database.batch([
        database
          .insert(case_documents)
          .values({
            id: documentId,
            case_id: caseId,
            source_sha256: input.sha256,
            processing_version: input.processingVersion,
            source: input.source,
            pdf_key: input.pdfKey,
            text_key: input.textKey,
            text_sha256: input.textSha256,
            page_count: input.pageCount,
            status: input.status,
            hold_reason: input.holdReason,
            title: input.title,
            description: input.description,
            decision_date: normalizeDecisionDate(input.source.decisionDate),
          })
          .onConflictDoNothing()
          .returning({ documentId: case_documents.id }),
        database.run(sql`
          INSERT INTO reading_topics (id, label)
          SELECT value, value FROM json_each(${labels})
          WHERE EXISTS (SELECT 1 FROM case_documents WHERE id = ${documentId})
          ON CONFLICT (id) DO NOTHING
        `),
        database.run(sql`
          INSERT INTO case_document_topics (document_id, topic_id)
          SELECT ${documentId}, value FROM json_each(${labels})
          WHERE EXISTS (SELECT 1 FROM case_documents WHERE id = ${documentId})
        `),
      ]);
      if (created) return { caseId, documentId: created.documentId, created: true };

      const [existing] = await database
        .select({ documentId: case_documents.id })
        .from(case_documents)
        .where(
          and(
            eq(case_documents.case_id, caseId),
            eq(case_documents.source_sha256, input.sha256),
            eq(case_documents.processing_version, input.processingVersion),
          ),
        );
      if (!existing) throw new InternalServerError("Registered document could not be read");
      return { caseId, documentId: existing.documentId, created: false };
    },
    async findPrepared(
      courtCaseId: PreparedJudgment["courtCaseId"],
      sha256: string,
      version: number,
    ) {
      const [document] = await database.all<{
        documentId: string;
        caseId: string;
        status: "ready" | "held";
      }>(sql`SELECT d.id AS "documentId", d.case_id AS "caseId", d.status FROM case_documents d
        JOIN cases c ON c.id = d.case_id JOIN case_id_by_courts i ON i.random_id = c.case_id_by_courts
        WHERE i.court_name = ${courtCaseId.court_name} AND i.branch_name = ${courtCaseId.branch_name ?? ""}
        AND i.era = ${courtCaseId.era} AND i.year = ${courtCaseId.year} AND i.type = ${courtCaseId.type} AND i.case_id = ${courtCaseId.number}
        AND d.source_sha256 = ${sha256} AND d.processing_version = ${version} LIMIT 1`);
      return { document: document ?? null };
    },
    async topics() {
      const rows =
        await database.all(sql`${latest} SELECT t.id, t.label, count(*) AS count
        FROM ready d JOIN case_document_topics dt ON dt.document_id = d.id JOIN reading_topics t ON t.id = dt.topic_id
        GROUP BY t.id, t.label ORDER BY count DESC, t.label`);
      return { topics: readingTopic.array().parse(rows) };
    },
    async list(topicIds: string[], offset: number) {
      if (topicIds.length === 0) return { cases: [], total: 0, offset, limit: 20 as const };
      const matches = sql`${latest}, matches AS (
        SELECT d.*, count(*) AS relevance
        FROM ready d JOIN case_document_topics dt ON dt.document_id = d.id
        WHERE dt.topic_id IN (SELECT value FROM json_each(${JSON.stringify(topicIds)}))
        GROUP BY d.id
      )`;
      const [rows, [total]] = await database.batch([
        database.all<{ topics: string }>(sql`
          ${matches} SELECT ${publicFields} FROM matches d
          ORDER BY d.relevance DESC, d.decision_date DESC NULLS LAST, d.case_id DESC
          LIMIT 20 OFFSET ${offset}
        `),
        database.all<{ total: number }>(sql`${matches} SELECT count(*) AS total FROM matches`),
      ]);
      return caseListResult.parse({
        cases: rows.map(parseReadingCase),
        total: total.total,
        offset,
        limit: 20,
      });
    },
    async getCase(caseId: string) {
      const [row] = await database.all<{ topics: string }>(
        sql`${latest} SELECT ${publicFields} FROM ready d WHERE d.case_id = ${caseId}`,
      );
      if (!row) throw new NotFoundError("Case not found");
      return parseReadingCase(row);
    },
    async getDocument(caseId: string, documentId: string) {
      const row = await documentRow(caseId, documentId);
      const object = row.textKey ? await bucket.get(row.textKey) : null;
      if (!object || object.customMetadata?.sha256 !== row.textSha256)
        throw new InternalServerError("Judgment text is missing");
      const text = judgmentText.parse(await object.json());
      return { case: parseReadingCase(row), text };
    },
    async pdf(caseId: string, documentId: string, headers: Headers) {
      const row = await documentRow(caseId, documentId);
      const key = row.pdfKey;
      const head = await bucket.head(key);
      if (!head) throw new NotFoundError("PDF not found");
      const responseHeaders = new Headers({
        "Content-Type": "application/pdf",
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=86400",
        ETag: head.httpEtag,
      });
      const requested = headers.get("Range");
      let range: { offset: number; length: number } | undefined;
      if (requested) {
        const match = requested.match(/^bytes=(\d*)-(\d*)$/);
        let offset = 0,
          end = head.size - 1;
        if (!match || (!match[1] && !match[2]))
          return new Response(null, {
            status: 416,
            headers: { "Content-Range": `bytes */${head.size}` },
          });
        if (match[1]) {
          offset = Number(match[1]);
          if (match[2]) end = Math.min(end, Number(match[2]));
        } else offset = Math.max(0, head.size - Number(match[2]));
        if (
          !Number.isSafeInteger(offset) ||
          !Number.isSafeInteger(end) ||
          offset > end ||
          offset >= head.size ||
          (!match[1] && Number(match[2]) === 0)
        )
          return new Response(null, {
            status: 416,
            headers: { "Content-Range": `bytes */${head.size}` },
          });
        range = { offset, length: end - offset + 1 };
      }
      const object = await bucket.get(key, range ? { range } : undefined);
      if (!object) throw new NotFoundError("PDF not found");
      if (range) {
        responseHeaders.set(
          "Content-Range",
          `bytes ${range.offset}-${range.offset + range.length - 1}/${head.size}`,
        );
        responseHeaders.set("Content-Length", String(range.length));
        return new Response(object.body, { status: 206, headers: responseHeaders });
      }
      responseHeaders.set("Content-Length", String(object.size));
      return new Response(object.body, { headers: responseHeaders });
    },
  };
}

export function normalizeDecisionDate(value: string | null): string | null {
  if (!value) return null;
  const iso = value.match(/^(\d{4})[-/]([0-9]{1,2})[-/]([0-9]{1,2})$/);
  const japanese = value.replace(/\s/g, "").match(/^(令和|平成|昭和)(元|\d+)年(\d+)月(\d+)日$/);
  const parts = iso
    ? [+iso[1], +iso[2], +iso[3]]
    : japanese
      ? [
          { 令和: 2018, 平成: 1988, 昭和: 1925 }[japanese[1] as "令和" | "平成" | "昭和"] +
            (japanese[2] === "元" ? 1 : +japanese[2]),
          +japanese[3],
          +japanese[4],
        ]
      : null;
  if (!parts) return null;
  const [year, month, day] = parts;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  )
    return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
