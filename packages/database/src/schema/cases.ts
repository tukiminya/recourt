import {
  boolean,
  integer,
  json,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { drizzleUuidColmns, drizzleUuidColmnsWithDefault } from "./utils";
import { type EraName } from "@recourt/utils";
import { judges } from "./judges";

// 裁判所の事件ID `平成17(行コ)134` といった形式を正規化して保存
export const case_id_by_courts = pgTable(
  "case_id_by_courts",
  {
    random_id: drizzleUuidColmnsWithDefault.primaryKey(), // 機械的にアクセスしやすいランダムな UUID を割り当て。cases テーブルからの references はこのカラムに向ける
    era: text().$type<EraName>(),
    year: smallint(),
    type: text(),
    case_id: integer(),
  },
  (table) => [
    primaryKey({
      columns: [table.era, table.year, table.type, table.case_id],
    }),
  ],
);

export const cases = pgTable("cases", {
  id: drizzleUuidColmnsWithDefault.primaryKey(),
});

export const case_revisions = pgTable("case_revisions", {
  id: drizzleUuidColmnsWithDefault.primaryKey(),
  case_id: drizzleUuidColmns.notNull(),
  case_id_by_courts: drizzleUuidColmns.references(() => case_id_by_courts.random_id),
  comments: text(),
  article_schema_version: smallint(),
  is_published: boolean().default(false).notNull(),
  created_at: timestamp().defaultNow(),
  published_at: timestamp().defaultNow(),
});

export const case_revision_judges = pgTable("case_revision_judges", {
  revision_id: drizzleUuidColmns.primaryKey().references(() => case_revisions.id),
  judge_id: drizzleUuidColmns.references(() => judges.id),
  is_presiding: boolean().notNull(),
  opinion_type: text().notNull(),
  opinion_text: json(),
});

export const case_revision_acts = pgTable("case_revision_acts", {
  revision_id: drizzleUuidColmns.primaryKey().references(() => case_revisions.id),
});
