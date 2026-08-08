import { pgTable, text } from "drizzle-orm/pg-core";
import { drizzleUuidColmnsWithDefault } from "./utils";

export const judges = pgTable("judges", {
  id: drizzleUuidColmnsWithDefault.primaryKey(),
  display_name: text().notNull(),
});
