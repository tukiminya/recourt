import { eq } from "drizzle-orm";

import { createUuidV7, normalizeJudgeName } from "@recourt/core";
import {
  type NewCaseExplanation,
  type NewCaseJudge,
  type NewJudge,
  type NewOutcome,
  case_explanations,
  case_judges,
  cases,
  type createDatabase,
  judges as judgesTable,
  outcomes,
} from "@recourt/database";
import type { StructuredOutput } from "../schema.js";

export const normalizeStructuredOutput = async (
  db: ReturnType<typeof createDatabase>,
  caseId: string,
  structuredOutput: StructuredOutput,
) => {
  const createdAt = new Date().toISOString();
  const main_text = structuredOutput.main_text;
  const existingOutcome = await db
    .select({ outcome_type: outcomes.outcome_type, result: outcomes.result })
    .from(outcomes)
    .where(eq(outcomes.case_id, caseId))
    .get();
  const outcomeType = existingOutcome?.outcome_type ?? "不明";
  const outcomeResult = existingOutcome?.result ?? "不明";
  const outcomeRow: NewOutcome = {
    case_id: caseId,
    outcome_type: outcomeType,
    main_text: main_text,
    result: outcomeResult,
    created_at: createdAt,
  };
  await db
    .insert(outcomes)
    .values(outcomeRow)
    .onConflictDoUpdate({
      target: outcomes.case_id,
      set: {
        main_text: outcomeRow.main_text,
      },
    })
    .run();

  await db
    .update(cases)
    .set({ case_title_short: structuredOutput.case_title_short })
    .where(eq(cases.case_id, caseId))
    .run();

  const reasoningMarkdown =
    structuredOutput.reasoning_markdown ??
    (structuredOutput.reasoning.length > 0
      ? structuredOutput.reasoning.map((item) => `- ${item}`).join("\n")
      : null);

  const explanationRow: NewCaseExplanation = {
    case_id: caseId,
    summary: structuredOutput.summary,
    background: structuredOutput.background,
    issues_json: JSON.stringify(structuredOutput.issues),
    reasoning_json: JSON.stringify(structuredOutput.reasoning),
    reasoning_markdown: reasoningMarkdown,
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
      opinion_summary: judge?.supplementary_opinion ? (judge?.opinion_summary ?? null) : null,
      opinion_stance: judge?.opinion_stance ?? "unknown",
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
