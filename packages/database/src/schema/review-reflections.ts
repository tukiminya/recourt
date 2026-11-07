import { cockroachTable, index, jsonb, text, timestamp } from "drizzle-orm/cockroach-core";
import type { ReviewReflection } from "@recourt/types";

export const review_reflections = cockroachTable(
  "review_reflections",
  {
    request_id: text().primaryKey(),
    judge_id: text().notNull(),
    case_id: text().notNull(),
    catalog_version: text().notNull(),
    reason_ids: jsonb().$type<ReviewReflection["reasons"]>().notNull(),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("review_reflections_context").on(table.judge_id, table.case_id, table.catalog_version),
  ],
);
