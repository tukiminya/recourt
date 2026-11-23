import { sql } from "drizzle-orm";
import type { RevisionStatus } from "@recourt/types";
import type { EraName } from "@recourt/utils";
import { check, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { judges } from "./judges";
import { databaseTimeMs, dateColumn, uuidV7Column, uuidV7ColumnWithDefault } from "./utils";

// 裁判所・支部と `平成17(行コ)134` のような事件番号を正規化して保存
export const case_id_by_courts = sqliteTable(
  "case_id_by_courts",
  {
    random_id: uuidV7ColumnWithDefault().notNull().primaryKey(), // cases から参照する UUID
    court_name: text().notNull(),
    branch_name: text().notNull(),
    era: text().$type<EraName>().notNull(),
    year: integer().notNull(),
    type: text().notNull(),
    case_id: integer().notNull(),
  },
  (table) => [
    unique("case_id_by_courts_natural_key").on(
      table.court_name,
      table.branch_name,
      table.era,
      table.year,
      table.type,
      table.case_id,
    ),
  ],
);

export const cases = sqliteTable(
  "cases",
  {
    id: uuidV7ColumnWithDefault().notNull().primaryKey(),
    case_id_by_courts: uuidV7Column().references(() => case_id_by_courts.random_id),
  },
  (table) => [unique("cases_case_id_by_courts").on(table.case_id_by_courts)],
);

export const case_revisions = sqliteTable(
  "case_revisions",
  {
    id: uuidV7ColumnWithDefault().notNull().primaryKey(),
    case_id: uuidV7Column()
      .notNull()
      .references(() => cases.id),
    comments: text(),
    title: text().notNull(),
    article_schema_version: integer().notNull(),
    article_sha256: text().notNull(),
    source_document_sha256: text(),
    status: text().$type<RevisionStatus>().default("draft").notNull(),
    created_at: dateColumn().default(databaseTimeMs).notNull(),
    published_at: dateColumn(),
  },
  (table) => [
    check(
      "case_revisions_status",
      sql`${table.status} IN ('draft', 'publishing', 'published', 'deleting')`,
    ),
    check(
      "case_revisions_published_at_matches_status",
      sql`(${table.status} = 'published' AND ${table.published_at} IS NOT NULL) OR (${table.status} <> 'published' AND ${table.published_at} IS NULL)`,
    ),
    check(
      "case_revisions_source_document_sha256",
      sql`${table.source_document_sha256} IS NULL OR
        (length(${table.source_document_sha256}) = 64 AND ${table.source_document_sha256} NOT GLOB '*[^0-9a-f]*')`,
    ),
    unique("case_revisions_case_id_source_document_sha256").on(
      table.case_id,
      table.source_document_sha256,
    ),
  ],
);

export const case_revision_judges = sqliteTable("case_revision_judges", {
  revision_id: uuidV7Column()
    .notNull()
    .primaryKey()
    .references(() => case_revisions.id, { onDelete: "cascade" }),
  judge_id: uuidV7Column().references(() => judges.id),
  is_presiding: integer({ mode: "boolean" }).notNull(),
  opinion_type: text().notNull(),
  opinion_text: text({ mode: "json" }),
});

export const case_revision_acts = sqliteTable("case_revision_acts", {
  revision_id: uuidV7Column()
    .notNull()
    .primaryKey()
    .references(() => case_revisions.id, { onDelete: "cascade" }),
});
