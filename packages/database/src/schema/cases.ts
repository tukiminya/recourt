import {
  boolean,
  check,
  integer,
  json,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { drizzleUuidColmns, drizzleUuidColmnsWithDefault } from "./utils";
import { type EraName } from "@recourt/utils";
import { judges } from "./judges";

export const caseRevisionStatus = pgEnum("case_revision_status", [
  "draft",
  "publishing",
  "published",
  "deleting",
]);

// 裁判所の事件ID `平成17(行コ)134` といった形式を正規化して保存
export const case_id_by_courts = pgTable(
  "case_id_by_courts",
  {
    random_id: drizzleUuidColmnsWithDefault().primaryKey(), // 機械的にアクセスしやすいランダムな UUID を割り当て。cases テーブルからの references はこのカラムに向ける
    era: text().$type<EraName>().notNull(),
    year: smallint().notNull(),
    type: text().notNull(),
    case_id: integer().notNull(),
  },
  (table) => [
    unique("case_id_by_courts_natural_key").on(table.era, table.year, table.type, table.case_id),
  ],
);

export const cases = pgTable("cases", {
  id: drizzleUuidColmnsWithDefault().primaryKey(),
});

export const case_revisions = pgTable(
  "case_revisions",
  {
    id: drizzleUuidColmnsWithDefault().primaryKey(),
    case_id: drizzleUuidColmns()
      .notNull()
      .references(() => cases.id),
    case_id_by_courts: drizzleUuidColmns().references(() => case_id_by_courts.random_id),
    comments: text(),
    title: text().notNull(),
    article_schema_version: smallint().notNull(),
    article_sha256: text().notNull(),
    status: caseRevisionStatus().default("draft").notNull(),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
    published_at: timestamp({ withTimezone: true }),
  },
  (table) => [
    check(
      "case_revisions_published_at_matches_status",
      sql`(${table.status} = 'published' AND ${table.published_at} IS NOT NULL) OR (${table.status} <> 'published' AND ${table.published_at} IS NULL)`,
    ),
  ],
);

export const case_revision_judges = pgTable("case_revision_judges", {
  revision_id: drizzleUuidColmns()
    .primaryKey()
    .references(() => case_revisions.id, { onDelete: "cascade" }),
  judge_id: drizzleUuidColmns().references(() => judges.id),
  is_presiding: boolean().notNull(),
  opinion_type: text().notNull(),
  opinion_text: json(),
});

export const case_revision_acts = pgTable("case_revision_acts", {
  revision_id: drizzleUuidColmns()
    .primaryKey()
    .references(() => case_revisions.id, { onDelete: "cascade" }),
});
