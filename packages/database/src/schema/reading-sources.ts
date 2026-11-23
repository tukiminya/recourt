import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { dateColumn } from "./utils";

export const reading_sources = sqliteTable(
  "reading_sources",
  {
    id: text().notNull().primaryKey(),
    requested_url: text().notNull(),
    source_url: text().notNull(),
    title: text().notNull(),
    content: text().notNull(),
    fetched_at: dateColumn().notNull(),
    expires_at: dateColumn().notNull(),
  },
  (table) => [index("reading_sources_expires_at_idx").on(table.expires_at)],
);
