import { getR2Object } from "@recourt/core";
import { ai_outputs, cases, type createDatabase } from "@recourt/database";
import { and, eq, ne } from "drizzle-orm";
import type { IngestConfig } from "../load-config.js";
import { structuredOutputSchema } from "../schema.js";
import { normalizeStructuredOutput } from "./output-normalizer.js";

export const findDuplicateCase = async (
  db: ReturnType<typeof createDatabase>,
  pdfHash: string,
  caseId: string,
) => {
  return db
    .select({ case_id: cases.case_id })
    .from(cases)
    .where(and(eq(cases.pdf_hash, pdfHash), ne(cases.case_id, caseId)))
    .get();
};

export const reuseExistingAiOutputIfPossible = async (input: {
  db: ReturnType<typeof createDatabase>;
  r2Client: ReturnType<typeof import("@recourt/core").createR2Client>;
  config: IngestConfig;
  caseId: string;
  pdfHash: string;
  startedAt: string;
  duplicateCaseId: string;
}): Promise<boolean> => {
  const existingOutput = await input.db
    .select({
      output_r2_key: ai_outputs.output_r2_key,
      request_r2_key: ai_outputs.request_r2_key,
      response_r2_key: ai_outputs.response_r2_key,
    })
    .from(ai_outputs)
    .where(eq(ai_outputs.case_id, input.duplicateCaseId))
    .get();

  if (!existingOutput) {
    return false;
  }

  try {
    console.log(`[ingest] reuse ai output from case=${input.duplicateCaseId}`);
    const outputBytes = await getR2Object(
      input.r2Client,
      input.config.r2.bucket,
      existingOutput.output_r2_key,
    );
    const outputText = Buffer.from(outputBytes).toString("utf-8");
    const outputJson = JSON.parse(outputText);
    const parsedOutput = structuredOutputSchema.safeParse(outputJson);

    if (!parsedOutput.success) {
      return false;
    }

    console.log(`[ingest] reuse output parsed ok case=${input.caseId}`);
    await input.db
      .update(cases)
      .set({ pdf_hash: input.pdfHash })
      .where(eq(cases.case_id, input.caseId))
      .run();

    await input.db
      .insert(ai_outputs)
      .values({
        case_id: input.caseId,
        output_r2_key: existingOutput.output_r2_key,
        request_r2_key: existingOutput.request_r2_key,
        response_r2_key: existingOutput.response_r2_key,
        created_at: input.startedAt,
      })
      .run();

    await normalizeStructuredOutput(input.db, input.caseId, parsedOutput.data);
    return true;
  } catch {
    return false;
  }
};
