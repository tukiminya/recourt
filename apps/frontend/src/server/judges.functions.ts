import { createServerFn } from "@tanstack/react-start";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { case_judges, cases as casesTable, judges, outcomes } from "@scpv/database";

import { getDatabase } from "./db.server.js";

export const getJudgeDetail = createServerFn({ method: "GET" })
  .inputValidator(z.object({ judgeId: z.string() }))
  .handler(async ({ data }) => {
    const db = getDatabase();
    const judge = await db
      .select({ judge_id: judges.judge_id, judge_name: judges.judge_name })
      .from(judges)
      .where(eq(judges.judge_id, data.judgeId))
      .get();

    if (!judge) {
      return null;
    }

    const caseRows = await db
      .select({
        case_id: casesTable.case_id,
        case_title: casesTable.case_title,
        decision_date: casesTable.decision_date,
        court_name: casesTable.court_name,
        result: outcomes.result,
        supplementary_opinion: case_judges.supplementary_opinion,
      })
      .from(case_judges)
      .innerJoin(casesTable, eq(casesTable.case_id, case_judges.case_id))
      .leftJoin(outcomes, eq(outcomes.case_id, casesTable.case_id))
      .where(eq(case_judges.judge_id, data.judgeId))
      .orderBy(desc(casesTable.decision_date))
      .all();

    return { judge, cases: caseRows };
  });
