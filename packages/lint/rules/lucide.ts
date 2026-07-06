import { Rule } from "@oxlint/plugins";

export const lucideImportRule = {
  create(context) {
    return {
      ImportDeclaration(node) {
        if (node.source.value === "lucide-react") {
          node.specifiers.forEach((node) => {
            if (
              node.type === "ImportSpecifier" &&
              node.local.type === "Identifier" &&
              node.imported.type === "Identifier"
            ) {
              if (node.local.name !== node.imported.name) {
                context.report({
                  message: "You MUST BE same name between local name & imported name",
                  node,
                });
              }
              if (!node.local.name.startsWith("Lucide")) {
                context.report({
                  message:
                    "You MUST BE import lucide component, startWith 'Lucide'. For example: `import { LucideX } from 'lucide-react'` ",
                  node,
                });
              }
            }
          });
        }
      },
    };
  },
} satisfies Rule;
