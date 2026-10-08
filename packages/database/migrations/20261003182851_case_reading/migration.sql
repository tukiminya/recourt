CREATE TABLE "case_document_topics" (
	"document_id" uuid,
	"topic_id" string,
	CONSTRAINT "case_document_topics_pkey" PRIMARY KEY("document_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE "case_documents" (
	"id" uuid PRIMARY KEY,
	"case_id" uuid NOT NULL,
	"source_sha256" string NOT NULL,
	"processing_version" int4 NOT NULL,
	"source" jsonb NOT NULL,
	"pdf_key" string NOT NULL,
	"text_key" string,
	"text_sha256" string,
	"page_count" int4 NOT NULL,
	"status" string NOT NULL,
	"hold_reason" string,
	"title" string NOT NULL,
	"description" string NOT NULL,
	"decision_date" string,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "case_documents_source_version" UNIQUE("case_id","source_sha256","processing_version")
);
--> statement-breakpoint
CREATE TABLE "reading_topics" (
	"id" string PRIMARY KEY,
	"label" string NOT NULL
);
--> statement-breakpoint
ALTER TABLE "case_document_topics" ADD CONSTRAINT "case_document_topics_document_id_case_documents_id_fkey" FOREIGN KEY ("document_id") REFERENCES "case_documents"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "case_document_topics" ADD CONSTRAINT "case_document_topics_topic_id_reading_topics_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "reading_topics"("id");--> statement-breakpoint
ALTER TABLE "case_documents" ADD CONSTRAINT "case_documents_case_id_cases_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id");--> statement-breakpoint
CREATE INDEX "case_document_topics_topic" ON "case_document_topics" ("topic_id");--> statement-breakpoint
CREATE INDEX "case_documents_ready_case" ON "case_documents" ("status","case_id");