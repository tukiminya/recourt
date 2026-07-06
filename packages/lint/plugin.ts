import { eslintCompatPlugin } from "@oxlint/plugins";
import { lucideImportRule } from "./rules/lucide";

const plugin = eslintCompatPlugin({
  meta: {
    name: "recourt-lint",
  },
  rules: {
    "import-lucide-start-by-lucide": lucideImportRule,
  },
});

export default plugin;
