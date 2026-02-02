CREATE TABLE `ai_outputs` (
	`case_id` text NOT NULL,
	`output_r2_key` text NOT NULL,
	`request_r2_key` text NOT NULL,
	`response_r2_key` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `case_judges` (
	`case_id` text NOT NULL,
	`judge_id` text NOT NULL,
	`supplementary_opinion` text,
	`created_at` text NOT NULL,
	PRIMARY KEY(`case_id`, `judge_id`)
);
--> statement-breakpoint
CREATE TABLE `cases` (
	`case_id` text PRIMARY KEY NOT NULL,
	`court_incident_id` text NOT NULL,
	`case_title` text NOT NULL,
	`case_type_guess` text NOT NULL,
	`decision_date` text NOT NULL,
	`court_name` text,
	`detail_url` text NOT NULL,
	`pdf_url` text NOT NULL,
	`pdf_hash` text,
	`ingested_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `crawl_ranges` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`executed_at` text NOT NULL,
	`version` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ingest_jobs` (
	`ingest_job_id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`status` text NOT NULL,
	`queued_at` text NOT NULL,
	`started_at` text,
	`completed_at` text,
	`error_message` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ingest_jobs_case_id_unique` ON `ingest_jobs` (`case_id`);--> statement-breakpoint
CREATE TABLE `judges` (
	`judge_id` text PRIMARY KEY NOT NULL,
	`judge_name` text NOT NULL,
	`judge_name_normalized` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `outcomes` (
	`outcome_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`case_id` text NOT NULL,
	`outcome_type` text NOT NULL,
	`main_text` text NOT NULL,
	`result` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `outcomes_case_id_unique` ON `outcomes` (`case_id`);--> statement-breakpoint
CREATE TABLE `related_laws` (
	`related_law_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`case_id` text NOT NULL,
	`law_id` text NOT NULL,
	`law_title` text NOT NULL,
	`egov_url` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `related_laws_case_law_unique` ON `related_laws` (`case_id`,`law_id`);