import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export type CaseTypeGuess = "civil" | "criminal" | "unknown";
export type IngestJobStatus = "pending" | "processing" | "done" | "error";

export const cases = sqliteTable(
  "cases",
  {
    case_id: text("case_id").primaryKey(),
    court_incident_id: text("court_incident_id").notNull(),
    incident_id: integer("incident_id"),
    case_title: text("case_title").notNull(),
    case_title_short: text("case_title_short"),
    case_type_guess: text("case_type_guess").notNull(),
    decision_date: text("decision_date").notNull(),
    court_name: text("court_name"),
    detail_url: text("detail_url").notNull(),
    pdf_url: text("pdf_url").notNull(),
    pdf_hash: text("pdf_hash"),
    ingested_at: text("ingested_at")
      .notNull()
      .$onUpdate(() => new Date().toISOString()),
  },
  (table) => [
    index("cases_court_incident_id_index").on(table.court_incident_id),
    index("cases_decision_date_index").on(table.decision_date),
  ],
);

export const incident_categories = sqliteTable("incident_categories", {
  category_id: integer("category_id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  label: text("label").notNull(),
  description: text("description"),
  active_from: text("active_from"),
  active_to: text("active_to"),
});

export const court_incidents = sqliteTable(
  "court_incidents",
  {
    incident_id: integer("incident_id").primaryKey({ autoIncrement: true }),
    raw_text: text("raw_text").notNull(),
    incident_era: text("incident_era").notNull(),
    incident_year: integer("incident_year").notNull(),
    incident_number: integer("incident_number").notNull(),
    category_id: integer("category_id").notNull(),
  },
  (table) => ({
    incident_unique: uniqueIndex("court_incidents_unique").on(
      table.incident_era,
      table.incident_year,
      table.category_id,
      table.incident_number,
    ),
  }),
);

export const judges = sqliteTable("judges", {
  judge_id: text("judge_id").primaryKey(),
  judge_name: text("judge_name").notNull(),
  judge_name_normalized: text("judge_name_normalized").notNull(),
  created_at: text("created_at").notNull(),
});

export const case_judges = sqliteTable(
  "case_judges",
  {
    case_id: text("case_id").notNull(),
    judge_id: text("judge_id").notNull(),
    supplementary_opinion: text("supplementary_opinion"),
    opinion_summary: text("opinion_summary"),
    opinion_stance: text("opinion_stance"),
    created_at: text("created_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.case_id, table.judge_id] })],
);

export const case_explanations = sqliteTable("case_explanations", {
  case_id: text("case_id").notNull().primaryKey(),
  summary: text("summary").notNull(),
  background: text("background").notNull(),
  issues_json: text("issues_json").notNull(),
  reasoning_json: text("reasoning_json").notNull(),
  reasoning_markdown: text("reasoning_markdown"),
  impact: text("impact").notNull(),
  impacted_parties_json: text("impacted_parties_json").notNull(),
  what_we_learned: text("what_we_learned").notNull(),
  glossary_json: text("glossary_json").notNull(),
  created_at: text("created_at").notNull(),
});

export const outcomes = sqliteTable("outcomes", {
  outcome_id: integer("outcome_id").primaryKey({ autoIncrement: true }),
  case_id: text("case_id").notNull().unique(),
  outcome_type: text("outcome_type").notNull(),
  main_text: text("main_text"),
  result: text("result").notNull(),
  created_at: text("created_at").notNull(),
});

export const ai_outputs = sqliteTable("ai_outputs", {
  case_id: text("case_id").notNull(),
  output_r2_key: text("output_r2_key").notNull(),
  request_r2_key: text("request_r2_key").notNull(),
  response_r2_key: text("response_r2_key").notNull(),
  created_at: text("created_at").notNull(),
});

export const crawl_ranges = sqliteTable("crawl_ranges", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  start_date: text("start_date").notNull(),
  end_date: text("end_date").notNull(),
  executed_at: text("executed_at").notNull(),
  version: text("version").notNull(),
});

export const ingest_jobs = sqliteTable(
  "ingest_jobs",
  {
    ingest_job_id: text("ingest_job_id").primaryKey(),
    case_id: text("case_id").notNull().unique(),
    status: text("status").notNull(),
    queued_at: text("queued_at").notNull(),
    started_at: text("started_at"),
    completed_at: text("completed_at"),
    error_message: text("error_message"),
  },
  (table) => [index("ingest_jobs_status_index").on(table.status)],
);

export type Database = {
  cases: typeof cases;
  incident_categories: typeof incident_categories;
  court_incidents: typeof court_incidents;
  judges: typeof judges;
  case_judges: typeof case_judges;
  case_explanations: typeof case_explanations;
  outcomes: typeof outcomes;
  ai_outputs: typeof ai_outputs;
  crawl_ranges: typeof crawl_ranges;
  ingest_jobs: typeof ingest_jobs;
};

export type CaseRow = typeof cases.$inferSelect;
export type NewCase = typeof cases.$inferInsert;
export type CaseUpdate = Partial<typeof cases.$inferInsert>;

export type IncidentCategoryRow = typeof incident_categories.$inferSelect;
export type NewIncidentCategory = typeof incident_categories.$inferInsert;

export type CourtIncidentRow = typeof court_incidents.$inferSelect;
export type NewCourtIncident = typeof court_incidents.$inferInsert;

export type JudgeRow = typeof judges.$inferSelect;
export type NewJudge = typeof judges.$inferInsert;
export type JudgeUpdate = Partial<typeof judges.$inferInsert>;

export type CaseJudgeRow = typeof case_judges.$inferSelect;
export type NewCaseJudge = typeof case_judges.$inferInsert;

export type CaseExplanationRow = typeof case_explanations.$inferSelect;
export type NewCaseExplanation = typeof case_explanations.$inferInsert;

export type OutcomeRow = typeof outcomes.$inferSelect;
export type NewOutcome = typeof outcomes.$inferInsert;

export type AiOutputRow = typeof ai_outputs.$inferSelect;
export type NewAiOutput = typeof ai_outputs.$inferInsert;

export type CrawlRangeRow = typeof crawl_ranges.$inferSelect;
export type NewCrawlRange = typeof crawl_ranges.$inferInsert;

export type IngestJobRow = typeof ingest_jobs.$inferSelect;
export type NewIngestJob = typeof ingest_jobs.$inferInsert;
export type IngestJobUpdate = Partial<typeof ingest_jobs.$inferInsert>;
