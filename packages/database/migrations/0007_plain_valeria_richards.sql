PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_case_explanations` (
	`case_id` text PRIMARY KEY NOT NULL,
	`summary` text NOT NULL,
	`background` text NOT NULL,
	`issues_json` text NOT NULL,
	`reasoning_json` text NOT NULL,
	`reasoning_markdown` text,
	`impact` text NOT NULL,
	`impacted_parties_json` text NOT NULL,
	`what_we_learned` text NOT NULL,
	`glossary_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_case_explanations`("case_id", "summary", "background", "issues_json", "reasoning_json", "reasoning_markdown", "impact", "impacted_parties_json", "what_we_learned", "glossary_json", "created_at") SELECT "case_id", "summary", "background", "issues_json", "reasoning_json", "reasoning_markdown", "impact", "impacted_parties_json", "what_we_learned", "glossary_json", "created_at" FROM `case_explanations`;--> statement-breakpoint
DROP TABLE `case_explanations`;--> statement-breakpoint
ALTER TABLE `__new_case_explanations` RENAME TO `case_explanations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `cases_court_incident_id_index` ON `cases` (`court_incident_id`);--> statement-breakpoint
CREATE INDEX `ingest_jobs_status_index` ON `ingest_jobs` (`status`);