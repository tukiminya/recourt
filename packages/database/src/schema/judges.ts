import { cockroachTable, text } from "drizzle-orm/cockroach-core";
import { drizzleUuidColmnsWithDefault } from "./utils";

export const judges = cockroachTable("judges", {
  id: drizzleUuidColmnsWithDefault().primaryKey(),
  display_name: text().notNull(),
});
