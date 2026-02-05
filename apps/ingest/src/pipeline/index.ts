import { eq } from "drizzle-orm";

import { createR2Client } from "@scpv/core";
import { type NewAiOutput, ai_outputs, cases, createDatabase, runMigrations } from "@scpv/database";

import type { IngestConfig } from "../load-config.js";
import {
  type AiMetadata,
  GEMINI_MODEL,
  buildAiRequestPayload,
  callGemini,
  storeAiOutput,
  storeAiRequest,
  storeAiResponse,
} from "./ai-io.js";
import { findDuplicateCase, reuseExistingAiOutputIfPossible } from "./duplicate-handler.js";
import { claimJob, loadPendingJobs, markJob } from "./job-runner.js";
import { normalizeStructuredOutput } from "./output-normalizer.js";
import { buildPdfKey, computePdfHash, fetchPdfBytes, storePdfToR2 } from "./pdf-io.js";

export const ingestPendingJobs = async (config: IngestConfig) => {
  const db = createDatabase({
    url: config.turso.url,
    authToken: config.turso.authToken,
  });
  await runMigrations(db);

  const r2Client = createR2Client(config.r2);

  const pendingJobs = await loadPendingJobs(db);

  console.log(`[ingest] pending jobs: ${pendingJobs.length}`);

  for (const job of pendingJobs) {
    const startedAt = new Date().toISOString();
    console.log(
      `[ingest] start job=${job.ingest_job_id} case=${job.case_id} incident=${job.court_incident_id} date=${job.decision_date}`,
    );
    const claimed = await claimJob(db, job, startedAt);
    if (!claimed) {
      console.log(`[ingest] skip job=${job.ingest_job_id} (already claimed)`);
      continue;
    }

    try {
      console.log(`[ingest] fetch pdf: ${job.pdf_url}`);
      const pdfBytes = await fetchPdfBytes(job.pdf_url);
      const pdfHash = computePdfHash(pdfBytes);
      console.log(`[ingest] pdf fetched bytes=${pdfBytes.length} hash=${pdfHash}`);
      const duplicate = await findDuplicateCase(db, pdfHash, job.case_id);

      if (duplicate) {
        console.log(`[ingest] duplicate pdf detected case=${duplicate.case_id}`);
        const reused = await reuseExistingAiOutputIfPossible({
          db,
          r2Client,
          config,
          caseId: job.case_id,
          pdfHash,
          startedAt,
          duplicateCaseId: duplicate.case_id,
        });
        if (reused) {
          await markJob(db, job, "done");
          continue;
        }
      }

      const pdfKey = buildPdfKey(job);
      console.log(`[ingest] upload pdf to r2 key=${pdfKey}`);
      await storePdfToR2(r2Client, config.r2.bucket, pdfKey, pdfBytes);

      await db.update(cases).set({ pdf_hash: pdfHash }).where(eq(cases.case_id, job.case_id)).run();

      const metadata: AiMetadata = {
        decision_date: job.decision_date,
        court_incident_id: job.court_incident_id,
        court_name: job.court_name ?? null,
      };
      const requestPayload = buildAiRequestPayload({
        prompt: config.gemini.prompt,
        metadata,
        pdfBytes,
        model: GEMINI_MODEL.modelId,
      });

      const requestKey = `requests/${job.case_id}/${startedAt}.json`;
      console.log(`[ingest] store ai request key=${requestKey}`);
      await storeAiRequest(r2Client, config.r2.bucket, requestKey, requestPayload);

      console.log(`[ingest] call gemini model=${GEMINI_MODEL.modelId}`);
      const aiResult = await callGemini({ config, pdfBytes, metadata });

      const aiResultJsonData = aiResult.output;

      const responsePayload = {
        text: aiResultJsonData,
        usage: aiResult.usage,
        warnings: aiResult.warnings,
        response: aiResult.response,
      };
      const responseKey = `responses/${job.case_id}/${startedAt}.json`;
      console.log(`[ingest] store ai response key=${responseKey}`);
      await storeAiResponse(r2Client, config.r2.bucket, responseKey, responsePayload);

      const outputKey = `outputs/${job.case_id}/${startedAt}.json`;
      console.log(`[ingest] store ai output key=${outputKey}`);
      await storeAiOutput(r2Client, config.r2.bucket, outputKey, aiResultJsonData);

      const aiOutputRow: NewAiOutput = {
        case_id: job.case_id,
        output_r2_key: outputKey,
        request_r2_key: requestKey,
        response_r2_key: responseKey,
        created_at: startedAt,
      };
      await db.insert(ai_outputs).values(aiOutputRow).run();

      console.log(`[ingest] normalize output case=${job.case_id}`);
      await normalizeStructuredOutput(db, job.case_id, aiResultJsonData);

      await markJob(db, job, "done");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await markJob(db, job, "error", message);
    }
  }
};
