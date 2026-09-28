import { sql } from "drizzle-orm";
import { drizzleUuidColmns, drizzleUuidColmnsWithDefault } from "./utils";
import { type EraName } from "@recourt/utils";
import { judges } from "./judges";
import { cockroachEnum, cockroachTable, boolean, check, smallint, text,timestamp,unique, int4, jsonb } from "drizzle-orm/cockroach-core";

export const caseRevisionStatus = cockroachEnum("case_revision_status", [
  "draft",
  "publishing",
  "published",
  "deleting",
]);

// 裁判所・支部と `平成17(行コ)134` のような事件番号を正規化して保存
export const case_id_by_courts = cockroachTable(
  "case_id_by_courts",
  {
    random_id: drizzleUuidColmnsWithDefault().primaryKey(), // 機械的にアクセスしやすいランダムな UUID を割り当て。cases テーブルからの references はこのカラムに向ける
    court_name: text().notNull(),
    branch_name: text().notNull(),
    era: text().$type<EraName>().notNull(),
    year: smallint().notNull(),
    type: text().notNull(),
    case_id: int4().notNull(),
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

export const cases = cockroachTable(
  "cases",
  {
    id: drizzleUuidColmnsWithDefault().primaryKey(),
    case_id_by_courts: drizzleUuidColmns().references(() => case_id_by_courts.random_id),
  },
  (table) => [unique("cases_case_id_by_courts").on(table.case_id_by_courts)],
);

export const case_revisions = cockroachTable(
  "case_revisions",
  {
    id: drizzleUuidColmnsWithDefault().primaryKey(),
    case_id: drizzleUuidColmns()
      .notNull()
      .references(() => cases.id),
    comments: text(),
    title: text().notNull(),
    article_schema_version: smallint().notNull(),
    article_sha256: text().notNull(),
    source_document_sha256: text(),
    status: caseRevisionStatus().default("draft").notNull(),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
    published_at: timestamp({ withTimezone: true }),
  },
  (table) => [
    check(
      "case_revisions_published_at_matches_status",
      sql`(${table.status} = 'published' AND ${table.published_at} IS NOT NULL) OR (${table.status} <> 'published' AND ${table.published_at} IS NULL)`,
    ),
    check(
      "case_revisions_source_document_sha256",
      sql`${table.source_document_sha256} IS NULL OR ${table.source_document_sha256} ~ '^[0-9a-f]{64}$'`,
    ),
    unique("case_revisions_case_id_source_document_sha256").on(
      table.case_id,
      table.source_document_sha256,
    ),
  ],
);

export const case_revision_judges = cockroachTable("case_revision_judges", {
  revision_id: drizzleUuidColmns()
    .primaryKey()
    .references(() => case_revisions.id, { onDelete: "cascade" }),
  judge_id: drizzleUuidColmns().references(() => judges.id),
  is_presiding: boolean().notNull(),
  opinion_type: text().notNull(),
  opinion_text: jsonb(),
});

export const case_revision_acts = cockroachTable("case_revision_acts", {
  revision_id: drizzleUuidColmns()
    .primaryKey()
    .references(() => case_revisions.id, { onDelete: "cascade" }),
});
