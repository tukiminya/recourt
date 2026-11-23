CREATE TABLE `case_id_by_courts` (
	`random_id` text PRIMARY KEY,
	`court_name` text NOT NULL,
	`branch_name` text NOT NULL,
	`era` text NOT NULL,
	`year` integer NOT NULL,
	`type` text NOT NULL,
	`case_id` integer NOT NULL,
	CONSTRAINT `case_id_by_courts_natural_key` UNIQUE(`court_name`,`branch_name`,`era`,`year`,`type`,`case_id`)
);
--> statement-breakpoint
CREATE TABLE `case_revision_acts` (
	`revision_id` text PRIMARY KEY,
	CONSTRAINT `fk_case_revision_acts_revision_id_case_revisions_id_fk` FOREIGN KEY (`revision_id`) REFERENCES `case_revisions`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `case_revision_judges` (
	`revision_id` text PRIMARY KEY,
	`judge_id` text,
	`is_presiding` integer NOT NULL,
	`opinion_type` text NOT NULL,
	`opinion_text` text,
	CONSTRAINT `fk_case_revision_judges_revision_id_case_revisions_id_fk` FOREIGN KEY (`revision_id`) REFERENCES `case_revisions`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_case_revision_judges_judge_id_judges_id_fk` FOREIGN KEY (`judge_id`) REFERENCES `judges`(`id`)
);
--> statement-breakpoint
CREATE TABLE `case_revisions` (
	`id` text PRIMARY KEY,
	`case_id` text NOT NULL,
	`comments` text,
	`title` text NOT NULL,
	`article_schema_version` integer NOT NULL,
	`article_sha256` text NOT NULL,
	`source_document_sha256` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer DEFAULT (cast(round(unixepoch('subsec') * 1000) as integer)) NOT NULL,
	`published_at` integer,
	CONSTRAINT `fk_case_revisions_case_id_cases_id_fk` FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`),
	CONSTRAINT `case_revisions_case_id_source_document_sha256` UNIQUE(`case_id`,`source_document_sha256`),
	CONSTRAINT "case_revisions_status" CHECK("status" IN ('draft', 'publishing', 'published', 'deleting')),
	CONSTRAINT "case_revisions_published_at_matches_status" CHECK(("status" = 'published' AND "published_at" IS NOT NULL) OR ("status" <> 'published' AND "published_at" IS NULL)),
	CONSTRAINT "case_revisions_source_document_sha256" CHECK("source_document_sha256" IS NULL OR
        (length("source_document_sha256") = 64 AND "source_document_sha256" NOT GLOB '*[^0-9a-f]*'))
);
--> statement-breakpoint
CREATE TABLE `cases` (
	`id` text PRIMARY KEY,
	`case_id_by_courts` text CONSTRAINT `cases_case_id_by_courts` UNIQUE,
	CONSTRAINT `fk_cases_case_id_by_courts_case_id_by_courts_random_id_fk` FOREIGN KEY (`case_id_by_courts`) REFERENCES `case_id_by_courts`(`random_id`)
);
--> statement-breakpoint
CREATE TABLE `courts` (
	`id` text PRIMARY KEY,
	`parent_id` text,
	`name` text NOT NULL,
	CONSTRAINT `fk_courts_parent_id_courts_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `courts`(`id`)
);
--> statement-breakpoint
CREATE TABLE `judges` (
	`id` text PRIMARY KEY,
	`display_name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reading_sources` (
	`id` text PRIMARY KEY,
	`requested_url` text NOT NULL,
	`source_url` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`fetched_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `case_ai_gate` (
	`id` text PRIMARY KEY,
	`next_start` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `case_classification_jobs` (
	`source_sha256` text NOT NULL,
	`processing_version` integer NOT NULL,
	`owner` text NOT NULL,
	`lease_until` integer NOT NULL,
	CONSTRAINT `case_classification_jobs_pk` PRIMARY KEY(`source_sha256`, `processing_version`)
);
--> statement-breakpoint
CREATE TABLE `case_document_topics` (
	`document_id` text NOT NULL,
	`topic_id` text NOT NULL,
	CONSTRAINT `case_document_topics_pk` PRIMARY KEY(`document_id`, `topic_id`),
	CONSTRAINT `fk_case_document_topics_document_id_case_documents_id_fk` FOREIGN KEY (`document_id`) REFERENCES `case_documents`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_case_document_topics_topic_id_reading_topics_id_fk` FOREIGN KEY (`topic_id`) REFERENCES `reading_topics`(`id`)
);
--> statement-breakpoint
CREATE TABLE `case_documents` (
	`id` text PRIMARY KEY,
	`case_id` text NOT NULL,
	`source_sha256` text NOT NULL,
	`processing_version` integer NOT NULL,
	`source` text NOT NULL,
	`pdf_key` text NOT NULL,
	`text_key` text,
	`text_sha256` text,
	`page_count` integer NOT NULL,
	`status` text NOT NULL,
	`hold_reason` text,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`decision_date` text,
	`created_at` integer DEFAULT (cast(round(unixepoch('subsec') * 1000) as integer)) NOT NULL,
	CONSTRAINT `fk_case_documents_case_id_cases_id_fk` FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`),
	CONSTRAINT `case_documents_source_version` UNIQUE(`case_id`,`source_sha256`,`processing_version`)
);
--> statement-breakpoint
CREATE TABLE `case_reading_holds` (
	`case_id` text NOT NULL,
	`pdf_url` text NOT NULL,
	`source` text NOT NULL,
	`reason` text NOT NULL,
	`updated_at` integer DEFAULT (cast(round(unixepoch('subsec') * 1000) as integer)) NOT NULL,
	CONSTRAINT `case_reading_holds_pk` PRIMARY KEY(`case_id`, `pdf_url`),
	CONSTRAINT `fk_case_reading_holds_case_id_cases_id_fk` FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`)
);
--> statement-breakpoint
CREATE TABLE `reading_topics` (
	`id` text PRIMARY KEY,
	`label` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `review_reflections` (
	`request_id` text PRIMARY KEY,
	`judge_id` text NOT NULL,
	`case_id` text NOT NULL,
	`catalog_version` text NOT NULL,
	`reason_ids` text NOT NULL,
	`created_at` integer DEFAULT (cast(round(unixepoch('subsec') * 1000) as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reading_sources_expires_at_idx` ON `reading_sources` (`expires_at`);--> statement-breakpoint
CREATE INDEX `case_document_topics_topic` ON `case_document_topics` (`topic_id`);--> statement-breakpoint
CREATE INDEX `case_documents_ready_case` ON `case_documents` (`status`,`case_id`);--> statement-breakpoint
CREATE INDEX `review_reflections_context` ON `review_reflections` (`judge_id`,`case_id`,`catalog_version`);