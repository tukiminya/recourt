import { hashBuffer, normalizeKeySegment, putR2Object } from "@recourt/core";

import type { PendingJob } from "./job-runner.js";

export const fetchPdfBytes = async (url: string): Promise<Uint8Array> => {
  const pdfResponse = await fetch(url);
  if (!pdfResponse.ok) {
    throw new Error(`PDF fetch failed: ${pdfResponse.status}`);
  }
  return new Uint8Array(await pdfResponse.arrayBuffer());
};

export const computePdfHash = (bytes: Uint8Array) => hashBuffer(bytes);

export const buildPdfKey = (job: PendingJob) =>
  `pdfs/${normalizeKeySegment(job.court_incident_id)}/${job.decision_date}.pdf`;

export const storePdfToR2 = async (
  r2Client: ReturnType<typeof import("@recourt/core").createR2Client>,
  bucket: string,
  key: string,
  bytes: Uint8Array,
) => {
  await putR2Object(r2Client, bucket, key, bytes, "application/pdf");
};
