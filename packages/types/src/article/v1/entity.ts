import z from "zod";

export const entities = z.record(
  z
    .string()
    .min(1)
    .describe("entities IDに該当するキー。あくまでこのJSON内でユニークであることが求められる。"),
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
);
