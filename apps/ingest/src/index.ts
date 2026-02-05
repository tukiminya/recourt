import { loadConfig } from "./load-config.js";
import { ingestPendingJobs } from "./pipeline/index.js";

const config = loadConfig();

ingestPendingJobs(config).catch((error) => {
  console.error("ingest failed", error);
  process.exitCode = 1;
});
