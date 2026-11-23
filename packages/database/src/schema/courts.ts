import { foreignKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { uuidV7Column, uuidV7ColumnWithDefault } from "./utils";

export const courts = sqliteTable(
  "courts",
  {
    id: uuidV7ColumnWithDefault().notNull().primaryKey(),
    parent_id: uuidV7Column(),
    name: text().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.parent_id],
      foreignColumns: [table.id],
    }),
  ],
);
