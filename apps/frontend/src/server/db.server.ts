import { createDatabase } from "@recourt/database";

let dbInstance: ReturnType<typeof createDatabase> | null = null;

export const getDatabase = () => {
  if (dbInstance) {
    return dbInstance;
  }

  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    throw new Error("Missing env var: TURSO_DATABASE_URL");
  }

  dbInstance = createDatabase({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return dbInstance;
};
