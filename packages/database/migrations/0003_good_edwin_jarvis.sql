CREATE TABLE `case_explanations` (
	`case_id` text NOT NULL,
	`summary` text NOT NULL,
	`background` text NOT NULL,
	`issues_json` text NOT NULL,
	`reasoning_json` text NOT NULL,
	`impact` text NOT NULL,
	`impacted_parties_json` text NOT NULL,
	`what_we_learned` text NOT NULL,
	`glossary_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `case_explanations_case_id_unique` ON `case_explanations` (`case_id`);--> statement-breakpoint
ALTER TABLE `case_judges` ADD `opinion_summary` text;--> statement-breakpoint
ALTER TABLE `cases` ADD `case_title_short` text;