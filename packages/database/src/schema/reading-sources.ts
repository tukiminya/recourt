import { cockroachTable, index, text, timestamp, uuid } from "drizzle-orm/cockroach-core";

export const reading_sources = cockroachTable(
  "reading_sources",
  {
    id: uuid().primaryKey(),
    requested_url: text().notNull(),
    source_url: text().notNull(),
    title: text().notNull(),
    content: text().notNull(),
    fetched_at: timestamp({ withTimezone: true }).notNull(),
    expires_at: timestamp({ withTimezone: true }).notNull(),
  },
  (table) => [index("reading_sources_expires_at_idx").on(table.expires_at)],
);
