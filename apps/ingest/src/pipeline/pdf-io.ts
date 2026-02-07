import { hashBuffer, normalizeKeySegment, putR2Object } from "@recourt/core";

import type { PendingJob } from "./job-runner.js";

const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"
const MAX_PDF_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

const isPdfMagicBytes = (bytes: Uint8Array): boolean => {
  if (bytes.length < PDF_MAGIC_BYTES.length) {
    return false;
  }
  for (let i = 0; i < PDF_MAGIC_BYTES.length; i++) {
    if (bytes[i] !== PDF_MAGIC_BYTES[i]) {
      return false;
    }
  }
  return true;
};

export const fetchPdfBytes = async (url: string): Promise<Uint8Array> => {
  const pdfResponse = await fetch(url);
  if (!pdfResponse.ok) {
    throw new Error(`PDF fetch failed: ${pdfResponse.status}`);
  }

  const contentType = pdfResponse.headers.get("content-type");
  if (contentType && !contentType.includes("application/pdf")) {
    throw new Error(`Invalid content-type: expected application/pdf, got ${contentType}`);
  }

  const contentLength = pdfResponse.headers.get("content-length");
  if (contentLength) {
    const size = Number.parseInt(contentLength, 10);
    if (size > MAX_PDF_SIZE_BYTES) {
      throw new Error(`PDF too large: ${size} bytes exceeds limit of ${MAX_PDF_SIZE_BYTES} bytes`);
    }
  }

  const bytes = new Uint8Array(await pdfResponse.arrayBuffer());

  if (bytes.length > MAX_PDF_SIZE_BYTES) {
    throw new Error(`PDF too large: ${bytes.length} bytes exceeds limit of ${MAX_PDF_SIZE_BYTES} bytes`);
  }

  if (!isPdfMagicBytes(bytes)) {
    throw new Error("Invalid PDF: file does not start with PDF magic bytes (%PDF-)");
  }

  return bytes;
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
