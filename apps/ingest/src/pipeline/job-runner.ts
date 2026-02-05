import { and, asc, eq } from "drizzle-orm";

import { type IngestJobStatus, cases, type createDatabase, ingest_jobs } from "@scpv/database";

export type PendingJob = {
  ingest_job_id: string;
  case_id: string;
  court_incident_id: string;
  case_title: string;
  case_type_guess: string;
  decision_date: string;
  court_name: string | null;
  detail_url: string;
  pdf_url: string;
};

export const loadPendingJobs = async (
  db: ReturnType<typeof createDatabase>,
): Promise<PendingJob[]> => {
  return db
    .select({
      ingest_job_id: ingest_jobs.ingest_job_id,
      case_id: cases.case_id,
      court_incident_id: cases.court_incident_id,
      case_title: cases.case_title,
      case_type_guess: cases.case_type_guess,
      decision_date: cases.decision_date,
      court_name: cases.court_name,
      detail_url: cases.detail_url,
      pdf_url: cases.pdf_url,
    })
    .from(ingest_jobs)
    .innerJoin(cases, eq(cases.case_id, ingest_jobs.case_id))
    .where(eq(ingest_jobs.status, "pending"))
    .orderBy(asc(ingest_jobs.queued_at))
    .all();
};

export const claimJob = async (
  db: ReturnType<typeof createDatabase>,
  job: PendingJob,
  startedAt: string,
): Promise<boolean> => {
  const claimed = await db
    .update(ingest_jobs)
    .set({
      status: "processing",
      started_at: startedAt,
      error_message: null,
    })
    .where(and(eq(ingest_jobs.ingest_job_id, job.ingest_job_id), eq(ingest_jobs.status, "pending")))
    .run();

  const claimedRows = Number(claimed.rowsAffected ?? 0);
  return claimedRows > 0;
};

export const markJob = async (
  db: ReturnType<typeof createDatabase>,
  job: PendingJob,
  status: IngestJobStatus,
  errorMessage?: string,
) => {
  const completedAt = new Date().toISOString();
  await db
    .update(ingest_jobs)
    .set({
      status,
      completed_at: completedAt,
      error_message: errorMessage ?? null,
    })
    .where(eq(ingest_jobs.ingest_job_id, job.ingest_job_id))
    .run();
  if (status === "error") {
    console.error(
      `[ingest] done job=${job.ingest_job_id} status=${status} error=${errorMessage ?? "unknown"}`,
    );
    return;
  }
  console.log(`[ingest] done job=${job.ingest_job_id} status=${status}`);
};
