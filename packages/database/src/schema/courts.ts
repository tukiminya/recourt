import { drizzleUuidColmns, drizzleUuidColmnsWithDefault } from "./utils";
import { cockroachTable, text, foreignKey } from "drizzle-orm/cockroach-core";

export const courts = cockroachTable(
  "courts",
  {
    id: drizzleUuidColmnsWithDefault().primaryKey(),
    parent_id: drizzleUuidColmns(),
    name: text().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.parent_id],
      foreignColumns: [table.id],
    }),
  ],
);
