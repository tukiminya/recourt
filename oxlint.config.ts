import { defineConfig } from "oxfmt";

export default defineConfig({
  ignorePatterns: [
    "node_modules/**",
    "dist/**",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "app/web/src/routeTree.gen.ts",
    "worker-configuration.d.ts",
  ],
  jsPlugins: ["./packages/lint/dist/plugin.js"],
  rules: {
    "recourt-lint/import-lucide-start-by-lucide": "warn",
  },
  options: { typeAware: true, typeCheck: true },
});
