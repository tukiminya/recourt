PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_outcomes` (
	`outcome_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`case_id` text NOT NULL,
	`outcome_type` text NOT NULL,
	`main_text` text,
	`main_text_markdown` text,
	`result` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_outcomes`("outcome_id", "case_id", "outcome_type", "main_text", "main_text_markdown", "result", "created_at") SELECT "outcome_id", "case_id", "outcome_type", "main_text", "main_text_markdown", "result", "created_at" FROM `outcomes`;--> statement-breakpoint
DROP TABLE `outcomes`;--> statement-breakpoint
ALTER TABLE `__new_outcomes` RENAME TO `outcomes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `outcomes_case_id_unique` ON `outcomes` (`case_id`);