import { z } from "zod";

export const generationRichText = z.object({
  type: z.literal("text").describe("通常の文章テキストを表す。"),
  text: z
    .object({
      content: z
        .string()
        .min(1)
        .describe("表示する文章。意味のまとまりや装飾の単位ごとに分割する。"),
    })
    .describe("表示するテキストの内容。"),
  annotations: z
    .object({
      bold: z.boolean().describe("このテキストを太字で表示する場合はtrue。通常はfalse。"),
      underline: z.boolean().describe("このテキストに下線を付ける場合はtrue。通常はfalse。"),
      strikethrough: z
        .boolean()
        .describe("このテキストに取り消し線を付ける場合はtrue。通常はfalse。"),
    })
    .describe("このテキストに適用する装飾。"),
});

export type GenerationRichText = z.infer<typeof generationRichText>;
