CREATE TABLE "case_reading_holds" (
	"case_id" uuid,
	"pdf_url" string,
	"source" jsonb NOT NULL,
	"reason" string NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "case_reading_holds_pkey" PRIMARY KEY("case_id","pdf_url")
);
--> statement-breakpoint
ALTER TABLE "case_reading_holds" ADD CONSTRAINT "case_reading_holds_case_id_cases_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id");