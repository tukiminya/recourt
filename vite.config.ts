import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: ["app/web/src/routeTree.gen.ts", "worker-configuration.d.ts"],
  },
  lint: {
    ignorePatterns: [
      "node_modules/**",
      "dist/**",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "app/web/src/routeTree.gen.ts",
      "worker-configuration.d.ts",
    ],
    jsPlugins: [
      { name: "vite-plus", specifier: "vite-plus/oxlint-plugin" },
      "./packages/lint/dist/plugin.js",
    ],
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
      "recourt-lint/import-lucide-start-by-lucide": "warn",
    },
    options: { typeAware: true, typeCheck: true },
  },
});
