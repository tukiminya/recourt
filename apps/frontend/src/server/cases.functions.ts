import { createServerFn } from "@tanstack/react-start";
import { type SQL, and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";

import {
  case_explanations,
  case_judges,
  cases,
  incident_categories,
  judges,
  outcomes,
} from "@scpv/database";

import { getDatabase } from "./db.server.js";

const listCasesInput = z.object({
  incidentId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  sort: z.enum(["desc", "asc"]).optional(),
});

export const listCases = createServerFn({ method: "GET" })
  .inputValidator(listCasesInput)
  .handler(async ({ data }) => {
    const db = getDatabase();
    const conditions: SQL[] = [];
    if (data.incidentId) {
      conditions.push(eq(cases.court_incident_id, data.incidentId));
    }

    if (data.from) {
      conditions.push(gte(cases.decision_date, data.from));
    }

    if (data.to) {
      conditions.push(lte(cases.decision_date, data.to));
    }

    const sortDirection = data.sort ?? "desc";
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const baseQuery = db
      .select({
        case_id: cases.case_id,
        case_title: cases.case_title,
        case_title_short: cases.case_title_short,
        decision_date: cases.decision_date,
        court_name: cases.court_name,
        court_incident_id: cases.court_incident_id,
        case_type_guess: cases.case_type_guess,
        result: outcomes.result,
      })
      .from(cases)
      .leftJoin(outcomes, eq(outcomes.case_id, cases.case_id));

    const query = whereClause ? baseQuery.where(whereClause) : baseQuery;

    return query
      .orderBy(sortDirection === "asc" ? asc(cases.decision_date) : desc(cases.decision_date))
      .all();
  });

export const listIncidentCategories = createServerFn({ method: "GET" }).handler(async () => {
  const db = getDatabase();
  return db
    .select({
      code: incident_categories.code,
      label: incident_categories.label,
      active_from: incident_categories.active_from,
      active_to: incident_categories.active_to,
    })
    .from(incident_categories)
    .orderBy(asc(incident_categories.code))
    .all();
});

export const getCaseDetail = createServerFn({ method: "GET" })
  .inputValidator(z.object({ caseId: z.string() }))
  .handler(async ({ data }) => {
    const db = getDatabase();
    const caseRow = await db.select().from(cases).where(eq(cases.case_id, data.caseId)).get();

    if (!caseRow) {
      return null;
    }

    const outcome = await db.select().from(outcomes).where(eq(outcomes.case_id, data.caseId)).get();

    const explanation = await db
      .select()
      .from(case_explanations)
      .where(eq(case_explanations.case_id, data.caseId))
      .get();

    const judgeRows = await db
      .select({
        judge_id: judges.judge_id,
        judge_name: judges.judge_name,
        supplementary_opinion: case_judges.supplementary_opinion,
        opinion_summary: case_judges.opinion_summary,
      })
      .from(case_judges)
      .innerJoin(judges, eq(judges.judge_id, case_judges.judge_id))
      .where(eq(case_judges.case_id, data.caseId))
      .all();

    return {
      case: caseRow,
      outcome,
      explanation,
      judges: judgeRows,
    };
  });
