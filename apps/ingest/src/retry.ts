import { createDatabase, ingest_jobs, runMigrations } from "@recourt/database";
import { and, eq, inArray } from "drizzle-orm";

import { loadConfig } from "./load-config.js";

const parseArgs = (args: string[]) => {
  const hasAll = args.includes("--all");
  const hasProcessing = args.includes("--processing");
  const hasUnsafeAll = args.includes("--unsafe-all");
  const jobIdIndex = args.indexOf("--job-id");
  const jobId = jobIdIndex >= 0 ? args[jobIdIndex + 1] : null;

  return { hasAll, hasProcessing, hasUnsafeAll, jobId };
};

const run = async () => {
  const { hasAll, hasProcessing, hasUnsafeAll, jobId } = parseArgs(process.argv.slice(2));

  if (
    (hasAll && jobId) ||
    (!hasAll && !jobId) ||
    (jobId && hasProcessing) ||
    (jobId && hasUnsafeAll) ||
    (hasUnsafeAll && !hasAll)
  ) {
    console.error("usage: --all [--processing] [--unsafe-all] | --job-id <id>");
    process.exitCode = 1;
    return;
  }

  const config = loadConfig();
  const db = createDatabase({
    url: config.turso.url,
    authToken: config.turso.authToken,
  });
  await runMigrations(db);

  const updatePayload = {
    status: "pending" as const,
    error_message: null,
    started_at: null,
    completed_at: null,
  };

  if (hasAll) {
    const statuses: Array<"error" | "processing" | "done"> = ["error"];
    if (hasProcessing) {
      statuses.push("processing");
    }
    if (hasUnsafeAll) {
      statuses.push("done");
    }
    const result = await db
      .update(ingest_jobs)
      .set(updatePayload)
      .where(inArray(ingest_jobs.status, statuses))
      .run();
    const retried = Number(result.rowsAffected ?? 0);
    console.log(`[ingest] retry all status=${statuses.join(",")} retried=${retried}`);
    return;
  }

  if (!jobId) {
    console.error("usage: --all [--processing] [--unsafe-all] | --job-id <id>");
    process.exitCode = 1;
    return;
  }

  const result = await db
    .update(ingest_jobs)
    .set(updatePayload)
    .where(and(eq(ingest_jobs.ingest_job_id, jobId), eq(ingest_jobs.status, "error")))
    .run();
  const retried = Number(result.rowsAffected ?? 0);
  console.log(`[ingest] retry job_id=${jobId} retried=${retried}`);
};

run().catch((error) => {
  console.error("retry failed", error);
  process.exitCode = 1;
});
