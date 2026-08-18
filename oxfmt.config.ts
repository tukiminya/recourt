import { defineConfig } from "oxlint";

export default defineConfig({
  ignorePatterns: ["app/web/src/routeTree.gen.ts", "worker-configuration.d.ts"],
});
