import { z } from "zod";

export const annotations = z.object({
  bold: z.boolean().default(false), // 太文字
  underline: z.boolean().default(true), // 下線
  strikethrough: z.boolean().default(false), // 打ち消し線
});

export const rich_text = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("text"),
      text: z.object({
        content: z.string(),
        link: z.url().nullable(),
      }),
      annotations: annotations,
    })
    .describe("通常のテキストや太文字などに利用するオブジェクトです。"),

  z
    .object({
      type: z.literal("mention"),
      mention: z.object({
        entity_id: z.string().min(1),
        entity_type: z.enum(["statute", "case", "person", "organization", "legal_term", "source"]),
      }),
      annotations: annotations,
    })
    .describe(
      "固有名詞や法令、被告人などを補足するオブジェクトです。entity_id を指定することで、クライアント側でその補足情報を簡単に閲覧させることができます。",
    ),
]);
