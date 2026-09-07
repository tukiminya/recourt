import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema/entry";

export const db = (connectionString: string) =>
  drizzle(connectionString, {
    schema,
  });
