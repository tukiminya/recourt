CREATE TABLE "review_reflections" (
	"request_id" string PRIMARY KEY,
	"judge_id" string NOT NULL,
	"case_id" string NOT NULL,
	"catalog_version" string NOT NULL,
	"reason_ids" jsonb NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "review_reflections_context" ON "review_reflections" ("judge_id","case_id","catalog_version");