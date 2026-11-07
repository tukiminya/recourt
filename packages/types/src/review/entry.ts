import { z } from "zod";

export const reviewReasonId = z.enum([
  "rights",
  "reasoning",
  "institutions",
  "impact",
  "undecided",
]);
export const reviewReasons: Array<{ id: z.infer<typeof reviewReasonId>; label: string }> = [
  { id: "rights", label: "権利や自由の保障" },
  { id: "reasoning", label: "判断の理由・説明" },
  { id: "institutions", label: "司法と立法の役割" },
  { id: "impact", label: "暮らしへの影響" },
  { id: "undecided", label: "まだ考えたいこと" },
];

export const reviewCatalogSchema = z.object({
  version: z.string().min(1),
  publishedAt: z.iso.date(),
  judges: z.array(z.object({ id: z.string(), name: z.string(), reading: z.string() })),
  cases: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      question: z.string(),
      date: z.iso.date(),
      caseNumber: z.string(),
      topic: z.string(),
      conclusion: z.string(),
      conclusionPages: z.tuple([z.number().int().positive(), z.number().int().positive()]),
      pdfUrl: z.url(),
      detailUrl: z.url(),
      opinions: z.array(
        z.object({
          judgeId: z.string(),
          kind: z.enum(["majority", "concurring", "opinion", "dissenting"]),
          summary: z.string(),
          pages: z.tuple([z.number().int().positive(), z.number().int().positive()]),
        }),
      ),
    }),
  ),
});
export type ReviewCatalog = z.infer<typeof reviewCatalogSchema>;
export type ReviewCase = ReviewCatalog["cases"][number];
export type ReviewJudge = ReviewCatalog["judges"][number];

export const reviewReflectionBody = z
  .strictObject({
    requestId: z.uuid(),
    catalogVersion: z.string().min(1).max(80),
    caseId: z.string().regex(/^[a-z0-9-]{1,80}$/),
    reasons: z.array(reviewReasonId).min(1).max(3),
  })
  .refine(({ reasons }) => new Set(reasons).size === reasons.length, {
    message: "Choose distinct reasons",
  });
export type ReviewReflection = z.infer<typeof reviewReflectionBody>;

export const reviewReasonSummary = z.object({
  total: z.number().int().nonnegative(),
  reasons: z.array(z.object({ id: reviewReasonId, count: z.number().int().nonnegative() })),
});
export type ReviewReasonSummary = z.infer<typeof reviewReasonSummary>;
