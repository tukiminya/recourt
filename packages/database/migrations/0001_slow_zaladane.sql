CREATE TABLE `court_incidents` (
	`incident_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`raw_text` text NOT NULL,
	`incident_era` text NOT NULL,
	`incident_year` integer NOT NULL,
	`incident_number` integer NOT NULL,
	`category_id` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `court_incidents_unique` ON `court_incidents` (`incident_era`,`incident_year`,`category_id`,`incident_number`);--> statement-breakpoint
CREATE TABLE `incident_categories` (
	`category_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`label` text NOT NULL,
	`description` text,
	`active_from` text,
	`active_to` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `incident_categories_code_unique` ON `incident_categories` (`code`);--> statement-breakpoint
ALTER TABLE `cases` ADD `incident_id` integer;