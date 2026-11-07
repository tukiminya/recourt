import { and, db, eq, review_reflections, sql } from "@recourt/database";
import { reviewReasons, type ReviewReflection, type ReviewReasonSummary } from "@recourt/types";

export interface ReviewReflectionStore {
  submit: (
    judgeId: string,
    input: ReviewReflection,
  ) => Promise<"created" | "existing" | "conflict">;
  summarize: (judgeId: string, caseId: string, version: string) => Promise<ReviewReasonSummary>;
}

export function createReviewReflectionStore(connectionString: string): ReviewReflectionStore {
  const database = db(connectionString);
  return {
    async submit(judgeId, input) {
      const created = await database
        .insert(review_reflections)
        .values({
          request_id: input.requestId,
          judge_id: judgeId,
          case_id: input.caseId,
          catalog_version: input.catalogVersion,
          reason_ids: input.reasons,
        })
        .onConflictDoNothing()
        .returning({ id: review_reflections.request_id });
      if (created.length) return "created";
      const [existing] = await database
        .select()
        .from(review_reflections)
        .where(eq(review_reflections.request_id, input.requestId));
      return existing &&
        existing.judge_id === judgeId &&
        existing.case_id === input.caseId &&
        existing.catalog_version === input.catalogVersion &&
        existing.reason_ids.length === input.reasons.length &&
        existing.reason_ids.every((id) => input.reasons.includes(id))
        ? "existing"
        : "conflict";
    },
    async summarize(judgeId, caseId, version) {
      const condition = and(
        eq(review_reflections.judge_id, judgeId),
        eq(review_reflections.case_id, caseId),
        eq(review_reflections.catalog_version, version),
      );
      // One statement gives the total and all reason counts from the same snapshot.
      const [result] = await database
        .select({
          total: sql<number>`count(*)::int`,
          rights: sql<number>`count(*) filter (where ${review_reflections.reason_ids} @> '["rights"]'::jsonb)::int`,
          reasoning: sql<number>`count(*) filter (where ${review_reflections.reason_ids} @> '["reasoning"]'::jsonb)::int`,
          institutions: sql<number>`count(*) filter (where ${review_reflections.reason_ids} @> '["institutions"]'::jsonb)::int`,
          impact: sql<number>`count(*) filter (where ${review_reflections.reason_ids} @> '["impact"]'::jsonb)::int`,
          undecided: sql<number>`count(*) filter (where ${review_reflections.reason_ids} @> '["undecided"]'::jsonb)::int`,
        })
        .from(review_reflections)
        .where(condition);
      return {
        total: Number(result.total),
        reasons: reviewReasons.map(({ id }) => ({ id, count: Number(result[id]) })),
      };
    },
  };
}
