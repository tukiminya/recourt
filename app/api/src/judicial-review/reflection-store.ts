import { and, count, db, eq, review_reflections, sql } from "@recourt/database";
import { reviewReasons, type ReviewReflection, type ReviewReasonSummary } from "@recourt/types";

export interface ReviewReflectionStore {
  submit: (
    judgeId: string,
    input: ReviewReflection,
  ) => Promise<"created" | "existing" | "conflict">;
  summarize: (judgeId: string, caseId: string, version: string) => Promise<ReviewReasonSummary>;
}

export function createReviewReflectionStore(binding: D1Database): ReviewReflectionStore {
  const database = db(binding);
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
      const countReason = (reason: ReviewReflection["reasons"][number]) => sql<number>`
        count(*) filter (where exists (
          select 1 from json_each(${review_reflections.reason_ids}) where value = ${reason}
        ))
      `;
      const [result] = await database
        .select({
          total: count(),
          rights: countReason("rights"),
          reasoning: countReason("reasoning"),
          institutions: countReason("institutions"),
          impact: countReason("impact"),
          undecided: countReason("undecided"),
        })
        .from(review_reflections)
        .where(condition);
      return {
        total: result.total,
        reasons: reviewReasons.map(({ id }) => ({ id, count: result[id] })),
      };
    },
  };
}
