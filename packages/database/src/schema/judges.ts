import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { uuidV7ColumnWithDefault } from "./utils";

export const judges = sqliteTable("judges", {
  id: uuidV7ColumnWithDefault().notNull().primaryKey(),
  display_name: text().notNull(),
});
