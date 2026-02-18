import { generateUUIDv7 } from "@recourt/utils";
import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * @description 各裁判所の情報を記録するテーブル
 */
export const courts = sqliteTable("courts", {
  id: text()
    .primaryKey()
    .$default(() => generateUUIDv7()),
  name: text().notNull(),
});

/**
 * @description 裁判官の情報を記録するテーブル。本名・所属裁判所と所属期間といったデータは `judges_tenure` テーブルを参照
 */
export const judges = sqliteTable("judges", {
  id: text()
    .primaryKey()
    .$default(() => generateUUIDv7()),
});

/**
 * @description 裁判官の本名を記録するテーブル。裁判官の結婚等による氏名の変更があった際に利用可能に。
 */
export const judge_names = sqliteTable(
  "judge_names",
  {
    judge_id: text()
      .primaryKey()
      .references(() => judges.id),
    name: text().notNull(),
    end_on: integer({ mode: "timestamp" }),
  },
  (table) => [index("judges_name_period_index").on(table.judge_id, table.end_on)],
);

/**
 * @description 裁判官の所属裁判所とその在籍期間を記録するテーブル
 */
export const judge_tenure = sqliteTable(
  "judge_tenure",
  {
    judges_id: text().references(() => judges.id),
    court_id: text().references(() => courts.id),
    start_date: integer({ mode: "timestamp" }),
    end_date: integer({ mode: "timestamp" }),
  },
  (table) => [
    index("judges_tenure_period_index").on(table.court_id, table.start_date, table.end_date),
  ],
);

/**
 * @description 判例を記録するテーブル
 */
export const cases = sqliteTable(
  "cases",
  {
    id: text().$default(() => generateUUIDv7()),
    court_id: text().references(() => courts.id),
    judge_date: integer({ mode: "timestamp" }),
    created_at: integer({ mode: "timestamp" }).$default(() => new Date()),
    updated_at: integer({ mode: "timestamp" })
      .$default(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("court_id_index").on(table.court_id),
    index("judge_date_index").on(table.judge_date),
  ],
);

/**
 * @description 判例に関わった裁判官と関連する情報を記録するテーブル
 */
export const cases_opinion = sqliteTable(
  "cases_opinion",
  {
    cases_id: text().references(() => cases.id),
    judges_id: text().references(() => judges.id),
    opinion_type: text({ enum: ["agree", "disagree", "comment", "other"] }),
    judge_comment: text(),
  },
  (table) => [
    primaryKey({ columns: [table.cases_id, table.judges_id] }),
    // 裁判官紹介で関わった裁判を提示するため
    index("judges_opinion_index").on(table.judges_id),
  ],
);

/**
 * @description 参照された法律を記録するテーブル
 */
export const related_laws = sqliteTable("related_laws", {
  id: text()
    .primaryKey()
    .$default(() => generateUUIDv7()),
  egov_law_id: text(),
});

/**
 * @description 判例にて参照された法律と、その時点での法のリビジョンIDを記録するテーブル
 */
export const cases_related_laws = sqliteTable(
  "cases_related_laws",
  {
    laws_id: text().references(() => related_laws.id),
    cases_id: text().references(() => cases.id),
    laws_revision_id: text(),
    comment: text(),
  },
  (table) => [primaryKey({ columns: [table.laws_id, table.cases_id] })],
);
