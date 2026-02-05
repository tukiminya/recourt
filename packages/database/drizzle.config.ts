import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "turso",
  schema: "./src/schema.ts",
  out: "./migrations",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL as string,
    authToken: process.env.TURSO_AUTH_TOKEN as string | undefined,
  },
});
