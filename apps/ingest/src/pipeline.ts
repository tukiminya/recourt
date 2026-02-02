import { google } from "@ai-sdk/google";
import { Output, generateText } from "ai";
import { and, asc, eq, ne } from "drizzle-orm";

import {
  createR2Client,
  createUuidV7,
  getR2Object,
  hashBuffer,
  normalizeJudgeName,
  normalizeKeySegment,
  putR2Object,
} from "@scpv/core";
import {
  type IngestJobStatus,
  type NewAiOutput,
  type NewCaseExplanation,
  type NewCaseJudge,
  type NewJudge,
  type NewOutcome,
  ai_outputs,
  case_explanations,
  case_judges,
  cases,
  createDatabase,
  ingest_jobs,
  judges as judgesTable,
  outcomes,
  runMigrations,
} from "@scpv/database";

import type { IngestConfig } from "./load-config.js";
import { type StructuredOutput, structuredOutputSchema } from "./schema.js";

type PendingJob = {
  ingest_job_id: string;
  case_id: string;
  court_incident_id: string;
  case_title: string;
  case_type_guess: string;
  decision_date: string;
  court_name: string | null;
  detail_url: string;
  pdf_url: string;
};

const GEMINI_MODEL = "gemini-3-flash";

const buildAiRequestPayload = (input: {
  prompt: string;
  metadata: {
    decision_date: string;
    court_incident_id: string;
    court_name: string | null;
  };
  pdfBytes: Uint8Array;
  model: string;
}) => {
  return {
    model: input.model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: input.prompt },
          {
            type: "file",
            data: Buffer.from(input.pdfBytes).toString("base64"),
            mimeType: "application/pdf",
          },
          { type: "text", text: JSON.stringify(input.metadata) },
        ],
      },
    ],
  };
};

export const ingestPendingJobs = async (config: IngestConfig) => {
  const db = createDatabase({
    url: config.turso.url,
    authToken: config.turso.authToken,
  });
  await runMigrations(db);

  const r2Client = createR2Client(config.r2);

  const pendingJobs: PendingJob[] = await db
    .select({
      ingest_job_id: ingest_jobs.ingest_job_id,
      case_id: cases.case_id,
      court_incident_id: cases.court_incident_id,
      case_title: cases.case_title,
      case_type_guess: cases.case_type_guess,
      decision_date: cases.decision_date,
      court_name: cases.court_name,
      detail_url: cases.detail_url,
      pdf_url: cases.pdf_url,
    })
    .from(ingest_jobs)
    .innerJoin(cases, eq(cases.case_id, ingest_jobs.case_id))
    .where(eq(ingest_jobs.status, "pending"))
    .orderBy(asc(ingest_jobs.queued_at))
    .all();

  console.log(`[ingest] pending jobs: ${pendingJobs.length}`);

  for (const job of pendingJobs) {
    const startedAt = new Date().toISOString();
    console.log(
      `[ingest] start job=${job.ingest_job_id} case=${job.case_id} incident=${job.court_incident_id} date=${job.decision_date}`,
    );
    const claimed = await db
      .update(ingest_jobs)
      .set({
        status: "processing",
        started_at: startedAt,
        error_message: null,
      })
      .where(
        and(eq(ingest_jobs.ingest_job_id, job.ingest_job_id), eq(ingest_jobs.status, "pending")),
      )
      .run();

    const claimedRows = Number(claimed.rowsAffected ?? 0);
    if (claimedRows === 0) {
      console.log(`[ingest] skip job=${job.ingest_job_id} (already claimed)`);
      continue;
    }

    const markJob = async (status: IngestJobStatus, errorMessage?: string) => {
      const completedAt = new Date().toISOString();
      await db
        .update(ingest_jobs)
        .set({
          status,
          completed_at: completedAt,
          error_message: errorMessage ?? null,
        })
        .where(eq(ingest_jobs.ingest_job_id, job.ingest_job_id))
        .run();
      if (status === "error") {
        console.error(
          `[ingest] done job=${job.ingest_job_id} status=${status} error=${errorMessage ?? "unknown"}`,
        );
        return;
      }
      console.log(`[ingest] done job=${job.ingest_job_id} status=${status}`);
    };

    try {
      console.log(`[ingest] fetch pdf: ${job.pdf_url}`);
      const pdfResponse = await fetch(job.pdf_url);
      if (!pdfResponse.ok) {
        throw new Error(`PDF fetch failed: ${pdfResponse.status}`);
      }
      const pdfBytes = new Uint8Array(await pdfResponse.arrayBuffer());
      const pdfHash = hashBuffer(pdfBytes);
      console.log(`[ingest] pdf fetched bytes=${pdfBytes.length} hash=${pdfHash}`);
      const duplicate = await db
        .select({ case_id: cases.case_id })
        .from(cases)
        .where(and(eq(cases.pdf_hash, pdfHash), ne(cases.case_id, job.case_id)))
        .get();

      if (duplicate) {
        console.log(`[ingest] duplicate pdf detected case=${duplicate.case_id}`);
        const existingOutput = await db
          .select({
            output_r2_key: ai_outputs.output_r2_key,
            request_r2_key: ai_outputs.request_r2_key,
            response_r2_key: ai_outputs.response_r2_key,
          })
          .from(ai_outputs)
          .where(eq(ai_outputs.case_id, duplicate.case_id))
          .get();

        if (existingOutput) {
          try {
            console.log(`[ingest] reuse ai output from case=${duplicate.case_id}`);
            const outputBytes = await getR2Object(
              r2Client,
              config.r2.bucket,
              existingOutput.output_r2_key,
            );
            const outputText = Buffer.from(outputBytes).toString("utf-8");
            const outputJson = JSON.parse(outputText);
            const parsedOutput = structuredOutputSchema.safeParse(outputJson);

            if (parsedOutput.success) {
              console.log(`[ingest] reuse output parsed ok case=${job.case_id}`);
              await db
                .update(cases)
                .set({ pdf_hash: pdfHash })
                .where(eq(cases.case_id, job.case_id))
                .run();

              const aiOutputRow: NewAiOutput = {
                case_id: job.case_id,
                output_r2_key: existingOutput.output_r2_key,
                request_r2_key: existingOutput.request_r2_key,
                response_r2_key: existingOutput.response_r2_key,
                created_at: startedAt,
              };
              await db.insert(ai_outputs).values(aiOutputRow).run();

              await normalizeStructuredOutput(db, job.case_id, parsedOutput.data);
              await markJob("done");
              continue;
            }
          } catch {}
        }
      }

      const pdfKey = `pdfs/${normalizeKeySegment(job.court_incident_id)}/${job.decision_date}.pdf`;
      console.log(`[ingest] upload pdf to r2 key=${pdfKey}`);
      await putR2Object(r2Client, config.r2.bucket, pdfKey, pdfBytes, "application/pdf");

      await db.update(cases).set({ pdf_hash: pdfHash }).where(eq(cases.case_id, job.case_id)).run();

      const metadata = {
        decision_date: job.decision_date,
        court_incident_id: job.court_incident_id,
        court_name: job.court_name ?? null,
      };
      const requestPayload = buildAiRequestPayload({
        prompt: config.gemini.prompt,
        metadata,
        pdfBytes,
        model: GEMINI_MODEL,
      });

      const requestKey = `requests/${job.case_id}/${startedAt}.json`;
      console.log(`[ingest] store ai request key=${requestKey}`);
      await putR2Object(
        r2Client,
        config.r2.bucket,
        requestKey,
        JSON.stringify(requestPayload),
        "application/json",
      );

      console.log(`[ingest] call gemini model=${GEMINI_MODEL}`);
      const aiResult = await generateText({
        model: google("gemini-3-flash-preview"),
        output: Output.object({
          schema: structuredOutputSchema,
        }),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: config.gemini.prompt },
              { type: "file", data: pdfBytes, mediaType: "application/pdf" },
              { type: "text", text: JSON.stringify(metadata) },
            ],
          },
        ],
      });
      const responsePayload = {
        object: aiResult.output,
        usage: aiResult.usage,
        warnings: aiResult.warnings,
        response: aiResult.response,
      };
      const responseKey = `responses/${job.case_id}/${startedAt}.json`;
      console.log(`[ingest] store ai response key=${responseKey}`);
      await putR2Object(
        r2Client,
        config.r2.bucket,
        responseKey,
        JSON.stringify(responsePayload),
        "application/json",
      );

      const outputKey = `outputs/${job.case_id}/${startedAt}.json`;
      console.log(`[ingest] store ai output key=${outputKey}`);
      await putR2Object(
        r2Client,
        config.r2.bucket,
        outputKey,
        JSON.stringify(aiResult.output),
        "application/json",
      );

      const aiOutputRow: NewAiOutput = {
        case_id: job.case_id,
        output_r2_key: outputKey,
        request_r2_key: requestKey,
        response_r2_key: responseKey,
        created_at: startedAt,
      };
      await db.insert(ai_outputs).values(aiOutputRow).run();

      console.log(`[ingest] normalize output case=${job.case_id}`);
      await normalizeStructuredOutput(db, job.case_id, aiResult.output);

      await markJob("done");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await markJob("error", message);
    }
  }
};

const normalizeStructuredOutput = async (
  db: ReturnType<typeof createDatabase>,
  caseId: string,
  structuredOutput: StructuredOutput,
) => {
  const createdAt = new Date().toISOString();
  const outcome = structuredOutput.outcome;
  const outcomeRow: NewOutcome = {
    case_id: caseId,
    outcome_type: outcome.type,
    main_text: outcome.main_text,
    result: outcome.result,
    created_at: createdAt,
  };
  await db
    .insert(outcomes)
    .values(outcomeRow)
    .onConflictDoNothing({ target: outcomes.case_id })
    .run();

  await db
    .update(cases)
    .set({ case_title_short: structuredOutput.case_title_short })
    .where(eq(cases.case_id, caseId))
    .run();

  const explanationRow: NewCaseExplanation = {
    case_id: caseId,
    summary: structuredOutput.summary,
    background: structuredOutput.background,
    issues_json: JSON.stringify(structuredOutput.issues),
    reasoning_json: JSON.stringify(structuredOutput.reasoning),
    impact: structuredOutput.impact,
    impacted_parties_json: JSON.stringify(structuredOutput.impacted_parties),
    what_we_learned: structuredOutput.what_we_learned,
    glossary_json: JSON.stringify(structuredOutput.glossary),
    created_at: createdAt,
  };
  await db
    .insert(case_explanations)
    .values(explanationRow)
    .onConflictDoNothing({ target: case_explanations.case_id })
    .run();

  const judges = structuredOutput.judges;
  for (const judge of judges) {
    const normalized = normalizeJudgeName(judge.judge_name);
    const existing = await db
      .select({ judge_id: judgesTable.judge_id })
      .from(judgesTable)
      .where(eq(judgesTable.judge_name_normalized, normalized))
      .get();

    const judgeId = existing?.judge_id ?? createUuidV7();

    if (!existing) {
      const judgeRow: NewJudge = {
        judge_id: judgeId,
        judge_name: judge.judge_name,
        judge_name_normalized: normalized,
        created_at: createdAt,
      };
      await db.insert(judgesTable).values(judgeRow).run();
    }

    const caseJudgeRow: NewCaseJudge = {
      case_id: caseId,
      judge_id: judgeId,
      supplementary_opinion: judge?.supplementary_opinion ?? null,
      opinion_summary: judge?.opinion_summary ?? null,
      created_at: createdAt,
    };
    await db
      .insert(case_judges)
      .values(caseJudgeRow)
      .onConflictDoNothing({
        target: [case_judges.case_id, case_judges.judge_id],
      })
      .run();
  }
};
