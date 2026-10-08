CREATE TYPE "case_revision_status" AS ENUM('draft', 'publishing', 'published', 'deleting');--> statement-breakpoint
CREATE TABLE "case_id_by_courts" (
	"random_id" uuid PRIMARY KEY,
	"court_name" string NOT NULL,
	"branch_name" string NOT NULL,
	"era" string NOT NULL,
	"year" int2 NOT NULL,
	"type" string NOT NULL,
	"case_id" int4 NOT NULL,
	CONSTRAINT "case_id_by_courts_natural_key" UNIQUE("court_name","branch_name","era","year","type","case_id")
);
--> statement-breakpoint
CREATE TABLE "case_revision_acts" (
	"revision_id" uuid PRIMARY KEY
);
--> statement-breakpoint
CREATE TABLE "case_revision_judges" (
	"revision_id" uuid PRIMARY KEY,
	"judge_id" uuid,
	"is_presiding" bool NOT NULL,
	"opinion_type" string NOT NULL,
	"opinion_text" jsonb
);
--> statement-breakpoint
CREATE TABLE "case_revisions" (
	"id" uuid PRIMARY KEY,
	"case_id" uuid NOT NULL,
	"comments" string,
	"title" string NOT NULL,
	"article_schema_version" int2 NOT NULL,
	"article_sha256" string NOT NULL,
	"source_document_sha256" string,
	"status" "case_revision_status" DEFAULT 'draft'::"case_revision_status" NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"published_at" timestamptz,
	CONSTRAINT "case_revisions_case_id_source_document_sha256" UNIQUE("case_id","source_document_sha256"),
	CONSTRAINT "case_revisions_published_at_matches_status" CHECK (("case_revisions"."status" = 'published' AND "case_revisions"."published_at" IS NOT NULL) OR ("case_revisions"."status" <> 'published' AND "case_revisions"."published_at" IS NULL)),
	CONSTRAINT "case_revisions_source_document_sha256" CHECK ("case_revisions"."source_document_sha256" IS NULL OR "case_revisions"."source_document_sha256" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" uuid PRIMARY KEY,
	"case_id_by_courts" uuid,
	CONSTRAINT "cases_case_id_by_courts" UNIQUE("case_id_by_courts")
);
--> statement-breakpoint
CREATE TABLE "courts" (
	"id" uuid PRIMARY KEY,
	"parent_id" uuid,
	"name" string NOT NULL
);
--> statement-breakpoint
CREATE TABLE "judges" (
	"id" uuid PRIMARY KEY,
	"display_name" string NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_sources" (
	"id" uuid PRIMARY KEY,
	"requested_url" string NOT NULL,
	"source_url" string NOT NULL,
	"title" string NOT NULL,
	"content" string NOT NULL,
	"fetched_at" timestamptz NOT NULL,
	"expires_at" timestamptz NOT NULL
);
--> statement-breakpoint
ALTER TABLE "case_revision_acts" ADD CONSTRAINT "case_revision_acts_revision_id_case_revisions_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "case_revisions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "case_revision_judges" ADD CONSTRAINT "case_revision_judges_revision_id_case_revisions_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "case_revisions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "case_revision_judges" ADD CONSTRAINT "case_revision_judges_judge_id_judges_id_fkey" FOREIGN KEY ("judge_id") REFERENCES "judges"("id");--> statement-breakpoint
ALTER TABLE "case_revisions" ADD CONSTRAINT "case_revisions_case_id_cases_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id");--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_case_id_by_courts_case_id_by_courts_random_id_fkey" FOREIGN KEY ("case_id_by_courts") REFERENCES "case_id_by_courts"("random_id");--> statement-breakpoint
ALTER TABLE "courts" ADD CONSTRAINT "courts_parent_id_courts_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "courts"("id");--> statement-breakpoint
CREATE INDEX "reading_sources_expires_at_idx" ON "reading_sources" ("expires_at");