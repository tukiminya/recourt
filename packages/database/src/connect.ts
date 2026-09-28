import { drizzle } from "drizzle-orm/cockroach";
import * as schema from "./schema/entry";

export const db = (connectionString: string) =>
  drizzle(connectionString, {
    schema,
  });
