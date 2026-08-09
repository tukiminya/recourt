import { z } from "zod";
import { rich_text } from "./rich-text";

export const block = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("heading_3"),
    heading_3: z.object({
      rich_text: z.array(rich_text),
    }),
  }),

  z.object({
    type: z.literal("paragraph"),
    paragraph: z.object({
      rich_text: z.array(rich_text),
    }),
  }),

  z.object({
    type: z.literal("bulleted_list_item"),
    bulleted_list_item: z.object({
      rich_text: z.array(rich_text),
    }),
  }),

  z.object({
    type: z.literal("numbered_list_item"),
    numbered_list_item: z.object({
      rich_text: z.array(rich_text),
    }),
  }),
]);
