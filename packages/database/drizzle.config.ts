import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  out: "./d1-migrations",
  schema: "./src/schema/entry.ts",
});
