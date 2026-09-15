import z from "zod";
import { rich_text } from "./rich-text";
import { entities } from "./entity";
import { section } from "./sections";
import { block } from "./block";

export { rich_text, entities, section, block };

const getBlockRichText = (articleBlock: z.infer<typeof block>) => {
  switch (articleBlock.type) {
    case "heading_3":
      return articleBlock.heading_3.rich_text;
    case "paragraph":
      return articleBlock.paragraph.rich_text;
    case "bulleted_list_item":
      return articleBlock.bulleted_list_item.rich_text;
    case "numbered_list_item":
      return articleBlock.numbered_list_item.rich_text;
    case "with_icon_list_item":
      return articleBlock.with_icon_list_item.rich_text;
  }
};

function checkRichTextEntities(
  richText: z.infer<typeof rich_text>[],
  entityIds: Set<string>,
  path: PropertyKey[],
  issues: z.core.$ZodRawIssue[],
) {
  richText.forEach((part, partIndex) => {
    if (part.type !== "mention" || entityIds.has(part.mention.entity_id)) return;

    issues.push({
      code: "custom",
      input: part.mention.entity_id,
      path: [...path, partIndex, "mention", "entity_id"],
      message: `Unknown entity_id: ${part.mention.entity_id}`,
    });
  });
}

export const CaseArticleStorageV1 = z
  .object({
    schema_version: z.literal("2026-08"),
    id: z.uuid(),
    created_time: z.iso.datetime(),
    title: z.array(rich_text),
    // mention の参照先。ホバーカードはここだけを読めば描画できる。
    entities: entities,

    sections: z.array(section),

    summary: z.object({
      type: z
        .enum(["opening_and_closing", "opening_only", "closing_only"])
        .default("opening_and_closing"),
      items: z.array(
        z.object({
          blocks: z.array(rich_text),
        }),
      ),
    }),
  })
  .check((ctx) => {
    const entityIds = new Set(Object.keys(ctx.value.entities));

    checkRichTextEntities(ctx.value.title, entityIds, ["title"], ctx.issues);

    ctx.value.sections.forEach((section, sectionIndex) => {
      section.blocks.forEach((block, blockIndex) => {
        checkRichTextEntities(
          getBlockRichText(block),
          entityIds,
          ["sections", sectionIndex, "blocks", blockIndex, block.type, "rich_text"],
          ctx.issues,
        );
      });
    });

    ctx.value.summary.items.forEach((item, itemIndex) => {
      checkRichTextEntities(
        item.blocks,
        entityIds,
        ["summary", "items", itemIndex, "blocks"],
        ctx.issues,
      );
    });
  });
