import {
  cockroachTable,
  text,
  int4,
  timestamp,
  jsonb,
  unique,
  index,
  primaryKey,
} from "drizzle-orm/cockroach-core";
import type { CourtCaseSource } from "@recourt/types";
import { cases } from "./cases";
import { drizzleUuidColmnsWithDefault, drizzleUuidColmns } from "./utils";

export const case_documents = cockroachTable(
  "case_documents",
  {
    id: drizzleUuidColmnsWithDefault().primaryKey(),
    case_id: drizzleUuidColmns()
      .notNull()
      .references(() => cases.id),
    source_sha256: text().notNull(),
    processing_version: int4().notNull(),
    source: jsonb().$type<CourtCaseSource>().notNull(),
    pdf_key: text().notNull(),
    text_key: text(),
    text_sha256: text(),
    page_count: int4().notNull(),
    status: text().$type<"ready" | "held">().notNull(),
    hold_reason: text(),
    title: text().notNull(),
    description: text().notNull(),
    decision_date: text(),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
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

export const reading_topics = cockroachTable("reading_topics", {
  id: text().primaryKey(),
  label: text().notNull(),
});
export const case_document_topics = cockroachTable(
  "case_document_topics",
  {
    document_id: drizzleUuidColmns()
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
export const case_reading_holds = cockroachTable(
  "case_reading_holds",
  {
    case_id: drizzleUuidColmns()
      .notNull()
      .references(() => cases.id),
    pdf_url: text().notNull(),
    source: jsonb().$type<CourtCaseSource>().notNull(),
    reason: text().notNull(),
    updated_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.case_id, table.pdf_url] })],
);

export const case_classification_jobs = cockroachTable(
  "case_classification_jobs",
  {
    source_sha256: text().notNull(),
    processing_version: int4().notNull(),
    owner: text().notNull(),
    lease_until: timestamp({ withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.source_sha256, table.processing_version] })],
);

export const case_ai_gate = cockroachTable("case_ai_gate", {
  id: text().primaryKey(),
  next_start: timestamp({ withTimezone: true }).notNull(),
});
