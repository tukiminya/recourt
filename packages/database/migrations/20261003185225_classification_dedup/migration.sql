CREATE TABLE "case_classification_jobs" (
	"source_sha256" string,
	"processing_version" int4,
	"owner" string NOT NULL,
	"lease_until" timestamptz NOT NULL,
	CONSTRAINT "case_classification_jobs_pkey" PRIMARY KEY("source_sha256","processing_version")
);
