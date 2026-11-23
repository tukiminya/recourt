import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { ReviewReflection } from "@recourt/types";
import { databaseTimeMs, dateColumn } from "./utils";

export const review_reflections = sqliteTable(
  "review_reflections",
  {
    request_id: text().notNull().primaryKey(),
    judge_id: text().notNull(),
    case_id: text().notNull(),
    catalog_version: text().notNull(),
    reason_ids: text({ mode: "json" }).$type<ReviewReflection["reasons"]>().notNull(),
    created_at: dateColumn().default(databaseTimeMs).notNull(),
  },
  (table) => [
    index("review_reflections_context").on(table.judge_id, table.case_id, table.catalog_version),
  ],
);
