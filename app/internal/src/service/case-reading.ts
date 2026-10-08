import {
  case_reading_holds,
  case_documents,
  case_document_topics,
  db,
  reading_topics,
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

const latest = sql`WITH ready AS (
  SELECT d.*, row_number() OVER (PARTITION BY case_id ORDER BY created_at DESC, id DESC) AS rank
  FROM case_documents d WHERE status = 'ready'
), catalog AS (
  SELECT d.*, coalesce((SELECT jsonb_agg(jsonb_build_object('id', t.id, 'label', t.label) ORDER BY t.label)
    FROM case_document_topics dt JOIN reading_topics t ON t.id = dt.topic_id WHERE dt.document_id = d.id), '[]'::jsonb) AS topics
  FROM ready d WHERE rank = 1
)`;
const publicFields = sql`case_id AS id, id AS "documentId", title, description,
  source->>'courtName' AS "courtName", source->>'caseNumber' AS "caseNumber",
  decision_date AS "decisionDate", source->>'detailUrl' AS "detailUrl", topics, page_count AS "pageCount"`;

export function createCaseReadingService(connection: string, bucket: R2Bucket) {
  const database = db(connection);
  const repository = createCasesRepository(connection);

  async function documentRow(caseId: string, documentId: string) {
    const result =
      await database.execute(sql`SELECT d.*, coalesce((SELECT jsonb_agg(jsonb_build_object('id', t.id, 'label', t.label) ORDER BY t.label)
      FROM case_document_topics dt JOIN reading_topics t ON t.id = dt.topic_id WHERE dt.document_id = d.id), '[]'::jsonb) AS topics
      FROM case_documents d WHERE d.case_id = ${caseId}::uuid AND d.id = ${documentId}::uuid AND d.status = 'ready'`);
    const row = result.rows[0];
    if (!row) throw new NotFoundError("Document not found");
    return row;
  }

  return {
    async claimClassification(sha256: string, version: number, owner: string) {
      return database.transaction(async (transaction) => {
        const result =
          await transaction.execute(sql`INSERT INTO case_classification_jobs (source_sha256, processing_version, owner, lease_until)
          VALUES (${sha256}, ${version}, ${owner}, now() + INTERVAL '15 minutes')
          ON CONFLICT (source_sha256, processing_version) DO UPDATE SET owner = excluded.owner, lease_until = excluded.lease_until
          WHERE case_classification_jobs.lease_until < now() OR case_classification_jobs.owner = excluded.owner RETURNING owner`);
        if (!result.rows[0])
          throw new ConflictError("Classification is already running", "CLASSIFICATION_BUSY");
        const gate =
          await transaction.execute(sql`INSERT INTO case_ai_gate (id, next_start) VALUES ('classification', now() + INTERVAL '15 seconds')
          ON CONFLICT (id) DO UPDATE SET next_start = excluded.next_start WHERE case_ai_gate.next_start <= now() RETURNING id`);
        if (!gate.rows[0])
          throw new ConflictError("Classification capacity is busy", "CLASSIFICATION_BUSY");
        return { claimed: true };
      });
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
      return database.transaction(async (transaction) => {
        const [created] = await transaction
          .insert(case_documents)
          .values({
            id: uuidv7(),
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
          .returning({ documentId: case_documents.id });
        if (!created) {
          const existing = await transaction.execute(
            sql`SELECT id FROM case_documents WHERE case_id = ${caseId}::uuid AND source_sha256 = ${input.sha256} AND processing_version = ${input.processingVersion}`,
          );
          return { caseId, documentId: String(existing.rows[0]?.id), created: false };
        }
        for (const label of readingTopicLabels(input.topics)) {
          await transaction
            .insert(reading_topics)
            .values({ id: label, label })
            .onConflictDoNothing();
          await transaction
            .insert(case_document_topics)
            .values({ document_id: created.documentId, topic_id: label })
            .onConflictDoNothing();
        }
        return { caseId, documentId: created.documentId, created: true };
      });
    },
    async findPrepared(
      courtCaseId: PreparedJudgment["courtCaseId"],
      sha256: string,
      version: number,
    ) {
      const result =
        await database.execute(sql`SELECT d.id AS "documentId", d.case_id AS "caseId", d.status FROM case_documents d
        JOIN cases c ON c.id = d.case_id JOIN case_id_by_courts i ON i.random_id = c.case_id_by_courts
        WHERE i.court_name = ${courtCaseId.court_name} AND i.branch_name = ${courtCaseId.branch_name ?? ""}
        AND i.era = ${courtCaseId.era} AND i.year = ${courtCaseId.year} AND i.type = ${courtCaseId.type} AND i.case_id = ${courtCaseId.number}
        AND d.source_sha256 = ${sha256} AND d.processing_version = ${version} LIMIT 1`);
      return { document: result.rows[0] ?? null };
    },
    async topics() {
      const result =
        await database.execute(sql`${latest} SELECT t.id, t.label, count(*)::int AS count
        FROM catalog d JOIN case_document_topics dt ON dt.document_id = d.id JOIN reading_topics t ON t.id = dt.topic_id
        GROUP BY t.id, t.label ORDER BY count DESC, t.label`);
      return {
        topics: readingTopic.array().parse(
          result.rows.map((row: Record<string, unknown>) => ({
            ...row,
            count: Number(row.count),
          })),
        ),
      };
    },
    async list(topicIds: string[], offset: number) {
      if (topicIds.length === 0) return { cases: [], total: 0, offset, limit: 20 as const };
      const ids = sql.join(
        topicIds.map((id) => sql`${id}`),
        sql`, `,
      );
      const relevance = sql`(SELECT count(*) FROM case_document_topics dt WHERE dt.document_id = d.id AND dt.topic_id IN (${ids}))`;
      const [rows, total] = await Promise.all([
        database.execute(
          sql`${latest} SELECT ${publicFields} FROM catalog d WHERE ${relevance} > 0 ORDER BY ${relevance} DESC, decision_date DESC NULLS LAST, id DESC LIMIT 20 OFFSET ${offset}`,
        ),
        database.execute(
          sql`${latest} SELECT count(*)::int AS total FROM catalog d WHERE ${relevance} > 0`,
        ),
      ]);
      return caseListResult.parse({
        cases: rows.rows.map((row: Record<string, unknown>) => ({
          ...row,
          pageCount: Number(row.pageCount),
        })),
        total: Number(total.rows[0]?.total ?? 0),
        offset,
        limit: 20,
      });
    },
    async getCase(caseId: string) {
      const result = await database.execute(
        sql`${latest} SELECT ${publicFields} FROM catalog WHERE case_id = ${caseId}::uuid`,
      );
      if (!result.rows[0]) throw new NotFoundError("Case not found");
      return readingCase.parse({ ...result.rows[0], pageCount: Number(result.rows[0].pageCount) });
    },
    async getDocument(caseId: string, documentId: string) {
      const row = await documentRow(caseId, documentId);
      const object = await bucket.get(String(row.text_key));
      if (!object || object.customMetadata?.sha256 !== row.text_sha256)
        throw new InternalServerError("Judgment text is missing");
      const text = judgmentText.parse(await object.json());
      const source = row.source as PreparedJudgment["source"];
      return {
        case: readingCase.parse({
          id: row.case_id,
          documentId: row.id,
          title: row.title,
          description: row.description,
          courtName: source.courtName,
          caseNumber: source.caseNumber,
          decisionDate: row.decision_date,
          detailUrl: source.detailUrl,
          topics: row.topics,
          pageCount: Number(row.page_count),
        }),
        text,
      };
    },
    async pdf(caseId: string, documentId: string, headers: Headers) {
      const row = await documentRow(caseId, documentId);
      const key = String(row.pdf_key);
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
