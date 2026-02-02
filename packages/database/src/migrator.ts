import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/libsql/migrator";

import type { createDatabase } from "./db.js";

const migrationsPath = fileURLToPath(new URL("../migrations", import.meta.url));

export const runMigrations = async (db: ReturnType<typeof createDatabase>) => {
  await migrate(db, { migrationsFolder: migrationsPath });
};
