import { z } from "zod";
import { rich_text } from "./rich-text";

export const support_icon = z.literal(["issue", "organization", "people", "goverment"]);

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

  z.object({
    type: z.literal("with_icon_list_item"),
    with_icon_list_item: z.object({
      icon: support_icon,
      rich_text: z.array(rich_text),
    }),
  }),
]);
