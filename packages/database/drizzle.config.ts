import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "cockroach",
  out: "./migrations",
  schema: "./src/schema/*",
});
