import { z } from "zod";

export const crawlResultSchema = z.object({
  detail_url: z.string().url(),
  pdf_url: z.string().url(),
  decision_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  court_incident_id: z.string().min(1),
  case_title: z.string().min(1),
  court_name: z.string().optional(),
  outcome_type: z.string().optional(),
  result: z.string().optional(),
  case_type_guess: z.enum(["civil", "criminal", "unknown"]).optional(),
});

export type CrawlResult = z.infer<typeof crawlResultSchema>;
