import { z } from "zod";
import { block } from "./v1/block";
import { rich_text } from "./v1/rich-text";
import { section } from "./v1/sections";
import { entities } from "./v1/entity";

// Notion API の仕様を参考にしてる。
// https://developers.notion.com/reference/rich-text

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
  }
};

/**
 * @description 判例ページに用いられるv1スキーマです。基本的に `latestCaseArticleSchema` を用いること。
 */
export const caseArticleSchemaV1 = z
  .object({
    schema_version: z.literal("2026-08"),
    id: z.uuid(),
    created_time: z.iso.datetime(),
    title: z.array(rich_text),
    // mention の参照先。ホバーカードはここだけを読めば描画できる。
    entities: entities,

    sections: z.array(section),
  })
  .check((ctx) => {
    const entityIds = new Set(Object.keys(ctx.value.entities));

    ctx.value.sections.forEach((section) => {
      section.blocks.forEach((block, blockIndex) => {
        const richText = getBlockRichText(block);

        richText.forEach((part, partIndex) => {
          if (part.type !== "mention") return;
          if (entityIds.has(part.mention.entity_id)) return;

          ctx.issues.push({
            code: "custom",
            input: part.mention.entity_id,
            path: [
              "blocks",
              blockIndex,
              block.type,
              "rich_text",
              partIndex,
              "mention",
              "entity_id",
            ],
            message: `Unknown entity_id: ${part.mention.entity_id}`,
          });
        });
      });
    });
  });
