import type * as schema from "./schema";

export type CaseTypeGuess = "civil" | "criminal" | "unknown";
export type IngestJobStatus = "pending" | "processing" | "done" | "error";

export type Database = {
  cases: typeof schema.cases;
  incident_categories: typeof schema.incident_categories;
  court_incidents: typeof schema.court_incidents;
  judges: typeof schema.judges;
  case_judges: typeof schema.case_judges;
  case_explanations: typeof schema.case_explanations;
  outcomes: typeof schema.outcomes;
  ai_outputs: typeof schema.ai_outputs;
  crawl_ranges: typeof schema.crawl_ranges;
  ingest_jobs: typeof schema.ingest_jobs;
};

export type CaseRow = typeof schema.cases.$inferSelect;
export type NewCase = typeof schema.cases.$inferInsert;
export type CaseUpdate = Partial<typeof schema.cases.$inferInsert>;

export type IncidentCategoryRow = typeof schema.incident_categories.$inferSelect;
export type NewIncidentCategory = typeof schema.incident_categories.$inferInsert;

export type CourtIncidentRow = typeof schema.court_incidents.$inferSelect;
export type NewCourtIncident = typeof schema.court_incidents.$inferInsert;

export type JudgeRow = typeof schema.judges.$inferSelect;
export type NewJudge = typeof schema.judges.$inferInsert;
export type JudgeUpdate = Partial<typeof schema.judges.$inferInsert>;

export type CaseJudgeRow = typeof schema.case_judges.$inferSelect;
export type NewCaseJudge = typeof schema.case_judges.$inferInsert;

export type CaseExplanationRow = typeof schema.case_explanations.$inferSelect;
export type NewCaseExplanation = typeof schema.case_explanations.$inferInsert;

export type OutcomeRow = typeof schema.outcomes.$inferSelect;
export type NewOutcome = typeof schema.outcomes.$inferInsert;

export type AiOutputRow = typeof schema.ai_outputs.$inferSelect;
export type NewAiOutput = typeof schema.ai_outputs.$inferInsert;

export type CrawlRangeRow = typeof schema.crawl_ranges.$inferSelect;
export type NewCrawlRange = typeof schema.crawl_ranges.$inferInsert;

export type IngestJobRow = typeof schema.ingest_jobs.$inferSelect;
export type NewIngestJob = typeof schema.ingest_jobs.$inferInsert;
export type IngestJobUpdate = Partial<typeof schema.ingest_jobs.$inferInsert>;
