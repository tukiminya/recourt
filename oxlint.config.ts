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
    "max-lines": ["warn", { max: 400, skipBlankLines: true, skipComments: true }],
    "max-lines-per-function": ["warn", { max: 70, skipBlankLines: true, skipComments: true }],
    "max-depth": ["warn", { max: 5 }],
    "max-params": ["warn", { max: 4 }],
  },
  options: { typeAware: true, typeCheck: true },
});
