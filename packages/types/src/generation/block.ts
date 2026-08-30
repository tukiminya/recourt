import { z } from "zod";

import { generationRichText } from "./rich-text";

export const generationBlock = z.object({
  type: z.literal("paragraph").describe("1つの段落を表す。"),
  paragraph: z
    .object({
      rich_text: z
        .array(generationRichText)
        .min(1)
        .describe("段落内のテキスト片。太字にしたい箇所は別のテキスト片に分割する。"),
    })
    .describe("段落の内容。"),
});

export type GenerationBlock = z.infer<typeof generationBlock>;
