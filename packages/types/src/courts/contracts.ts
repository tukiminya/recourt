import { z } from "zod";
import { uuidv7 } from "../uuid";
import { courtSearchCategory } from "./search-query";

export const courtDocument = z.object({
  role: z.enum(["full_text", "summary", "other"]),
  label: z.string(),
  url: z.url(),
});
export const courtCaseSource = z.object({
  provider: z.literal("courts_go_jp"),
  courtDetailId: z.string().regex(/^\d+$/),
  detailUrl: z.url(),
  caseNumber: z.string().min(1),
  caseName: z.string().nullable(),
  decisionDate: z.string().nullable(),
  courtName: z.string().nullable(),
  judgmentType: z.string().nullable(),
  result: z.string().nullable(),
  collectionCitation: z.string().nullable(),
  originalCourtName: z.string().nullable(),
  originalCaseNumber: z.string().nullable(),
  originalDecisionDate: z.string().nullable(),
  holding: z.string().nullable(),
  summary: z.string().nullable(),
  referencedLaws: z.string().nullable(),
  rawMetadata: z.record(z.string(), z.string()),
  documents: z.array(courtDocument),
});
export type CourtCaseSource = z.infer<typeof courtCaseSource>;
export const courtCaseUpsertResult = z.object({ caseId: uuidv7, shouldExtract: z.boolean() });
export const courtCaseSourceResult = courtCaseSource.extend({ caseId: uuidv7 });
export const crawlerQueueMessage = z.object({
  version: z.literal(1),
  crawlRunId: z.string().uuid(),
  jobId: z.string().min(1).max(100),
  category: courtSearchCategory,
  courtDetailId: z.string().regex(/^\d+$/),
  detailUrl: z.url(),
});
export type CrawlerQueueMessage = z.infer<typeof crawlerQueueMessage>;
export const extractQueueMessage = z.object({
  version: z.literal(1),
  crawlRunId: z.string().uuid(),
  jobId: z.string().min(1).max(100),
  caseId: uuidv7,
  pdfUrl: z.url(),
});
export type ExtractQueueMessage = z.infer<typeof extractQueueMessage>;
export const courtSearchResult = z.object({
  id: z.string().regex(/^\d+$/),
  label: z.string(),
  detailUrl: z.url(),
  lines: z.array(z.string()),
  pdfs: z.array(z.object({ label: z.string(), url: z.url() })),
});
export const courtSearchResponse = z.object({
  source: z.literal("courts.go.jp"),
  category: courtSearchCategory,
  upstreamUrl: z.url(),
  total: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  nextOffset: z.number().int().nonnegative().nullable(),
  results: z.array(courtSearchResult),
});
export const wikipediaSearchResponse = z.object({
  results: z.array(z.object({ title: z.string(), snippet: z.string(), url: z.url() })),
});
export const previousJudgmentResponse = z.object({
  found: z.boolean(),
  judgment: courtCaseSource.nullable(),
});
