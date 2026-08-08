import { foreignKey, pgTable, text } from "drizzle-orm/pg-core";
import { drizzleUuidColmns, drizzleUuidColmnsWithDefault } from "./utils";

export const courts = pgTable(
  "courts",
  {
    id: drizzleUuidColmnsWithDefault.primaryKey(),
    parent_id: drizzleUuidColmns,
    name: text().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.parent_id],
      foreignColumns: [table.id],
    }),
  ],
);
