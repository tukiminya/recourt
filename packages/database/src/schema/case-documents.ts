import {
  sqliteTable,
  text,
  integer,
  unique,
  index,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import type { CourtCaseSource } from "@recourt/types";
import { cases } from "./cases";
import { databaseTimeMs, dateColumn, uuidV7Column, uuidV7ColumnWithDefault } from "./utils";

export const case_documents = sqliteTable(
  "case_documents",
  {
    id: uuidV7ColumnWithDefault().notNull().primaryKey(),
    case_id: uuidV7Column()
      .notNull()
      .references(() => cases.id),
    source_sha256: text().notNull(),
    processing_version: integer().notNull(),
    source: text({ mode: "json" }).$type<CourtCaseSource>().notNull(),
    pdf_key: text().notNull(),
    text_key: text(),
    text_sha256: text(),
    page_count: integer().notNull(),
    status: text().$type<"ready" | "held">().notNull(),
    hold_reason: text(),
    title: text().notNull(),
    description: text().notNull(),
    decision_date: text(),
    created_at: dateColumn().default(databaseTimeMs).notNull(),
  },
  (table) => [
    unique("case_documents_source_version").on(
      table.case_id,
      table.source_sha256,
      table.processing_version,
    ),
    index("case_documents_ready_case").on(table.status, table.case_id),
  ],
);

export const reading_topics = sqliteTable("reading_topics", {
  id: text().notNull().primaryKey(),
  label: text().notNull(),
});
export const case_document_topics = sqliteTable(
  "case_document_topics",
  {
    document_id: uuidV7Column()
      .notNull()
      .references(() => case_documents.id, { onDelete: "cascade" }),
    topic_id: text()
      .notNull()
      .references(() => reading_topics.id),
  },
  (table) => [
    primaryKey({ columns: [table.document_id, table.topic_id] }),
    index("case_document_topics_topic").on(table.topic_id),
  ],
);

// Sources whose size prevents archiving are kept as holds, without a fake PDF hash.
export const case_reading_holds = sqliteTable(
  "case_reading_holds",
  {
    case_id: uuidV7Column()
      .notNull()
      .references(() => cases.id),
    pdf_url: text().notNull(),
    source: text({ mode: "json" }).$type<CourtCaseSource>().notNull(),
    reason: text().notNull(),
    updated_at: dateColumn().default(databaseTimeMs).notNull(),
  },
  (table) => [primaryKey({ columns: [table.case_id, table.pdf_url] })],
);

export const case_classification_jobs = sqliteTable(
  "case_classification_jobs",
  {
    source_sha256: text().notNull(),
    processing_version: integer().notNull(),
    owner: text().notNull(),
    lease_until: dateColumn().notNull(),
  },
  (table) => [primaryKey({ columns: [table.source_sha256, table.processing_version] })],
);

export const case_ai_gate = sqliteTable("case_ai_gate", {
  id: text().notNull().primaryKey(),
  next_start: dateColumn().notNull(),
});
