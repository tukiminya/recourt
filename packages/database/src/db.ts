import { createClient } from "@libsql/client/web";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema.js";

export interface DatabaseConfig {
  url: string;
  authToken?: string;
}

export const createDatabase = ({ url, authToken }: DatabaseConfig) => {
  const client = createClient({
    url,
    authToken,
  });

  return drizzle(client, { schema });
};
