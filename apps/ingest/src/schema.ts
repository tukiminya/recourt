import { z } from "zod";

export const crawlResultSchema = z.object({
  detail_url: z.string().url(),
  pdf_url: z.string().url(),
  decision_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  court_incident_id: z.string().min(1),
  case_title: z.string().min(1),
  court_name: z.string().optional().nullable(),
  case_type_guess: z.enum(["civil", "criminal", "unknown"]).optional(),
});

export const structuredOutputSchema = z.object({
  case_title_short: z.string().min(1),
  summary: z.string().min(1),
  background: z.string().min(1),
  issues: z.array(z.string().min(1)),
  reasoning: z.array(z.string().min(1)),
  impact: z.string().min(1),
  impacted_parties: z.array(z.string().min(1)),
  what_we_learned: z.string().min(1),
  glossary: z.array(
    z.object({
      term: z.string().min(1),
      explanation: z.string().min(1),
    }),
  ),
  judges: z.array(
    z.object({
      judge_name: z.string().min(1),
      judge_id: z.string().min(1),
      supplementary_opinion: z.string().nullable(),
      opinion_summary: z.string().nullable(),
    }),
  ),
  outcome: z.object({
    type: z.string(),
    main_text: z.string(),
    result: z.string(),
  }),
  decision_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  court_incident_id: z.string().min(1),
  court_name: z.string(),
});

export type CrawlResult = z.infer<typeof crawlResultSchema>;
export type StructuredOutput = z.infer<typeof structuredOutputSchema>;
