import { z } from "zod";
import { block } from "./v1/block";
import { rich_text } from "./v1/rich-text";
import { section } from "./v1/sections";

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

export const recourtCasePageSchema = z
  .object({
    schema_version: z.literal("2026-08"),

    id: z.uuid(),
    url: z.url().nullable(),
    created_time: z.iso.datetime(),
    last_edited_time: z.iso.datetime(),

    title: z.array(rich_text),

    // TODO: entities の設計は現在進行中
    // mention の参照先。ホバーカードはここだけを読めば描画できる。
    entities: z.record(
      z.string().min(1),
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("statute"),
          title: z.string().min(1),
          citation: z.string().min(1),
          summary: z.string().min(1),
          official_url: z.url().nullable(),
        }),

        z.object({
          type: z.literal("case"),
          title: z.string().min(1),
          court: z.string().nullable(),
          decision_date: z.iso.date().nullable(),
          case_number: z.string().nullable(),
          summary: z.string().nullable(),
          url: z.url().nullable(),
        }),

        z.object({
          type: z.literal("person"),
          name: z.string().min(1),
          role: z.string().nullable(),
          description: z.string().nullable(),
          url: z.url().nullable(),
        }),

        z.object({
          type: z.literal("organization"),
          name: z.string().min(1),
          description: z.string().nullable(),
          url: z.url().nullable(),
        }),

        z.object({
          type: z.literal("legal_term"),
          title: z.string().min(1),
          description: z.string().min(1),
          url: z.url().nullable(),
        }),

        z.object({
          type: z.literal("source"),
          title: z.string().min(1),
          publisher: z.string().nullable(),
          url: z.url().nullable(),
        }),
      ]),
    ),

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
