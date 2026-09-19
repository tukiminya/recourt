import { NonRetryableError } from "cloudflare:workflows";

import { InvalidCourtPdfUrlError, validateCourtPdfUrl } from "../../court-pdf-url";

const PDF_MEDIA_TYPE = "application/pdf";
const OCTET_STREAM_MEDIA_TYPE = "application/octet-stream";
export const MAX_PDF_BYTES = 25 * 1024 * 1024;

export async function fetchPdf(url: URL): Promise<Uint8Array> {
  try {
    validateCourtPdfUrl(url);
  } catch (error) {
    if (error instanceof InvalidCourtPdfUrlError) {
      throw new NonRetryableError(error.message);
    }
    throw error;
  }
  const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(60_000) });

  if (response.status >= 400 && response.status < 500) {
    throw new NonRetryableError(`PDF fetch failed with status ${response.status}.`);
  }

  if (!response.ok) {
    throw new Error(`PDF fetch failed with status ${response.status}.`);
  }

  const mediaType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();

  if (mediaType && mediaType !== PDF_MEDIA_TYPE && mediaType !== OCTET_STREAM_MEDIA_TYPE) {
    throw new NonRetryableError(`The response is not a PDF: ${mediaType}.`);
  }

  if (response.body === null) {
    throw new NonRetryableError("The PDF response does not contain a body.");
  }
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_PDF_BYTES) {
    throw new NonRetryableError("The PDF exceeds the 25 MiB limit.");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_PDF_BYTES) {
      await reader.cancel("PDF size limit exceeded");
      throw new NonRetryableError("The PDF exceeds the 25 MiB limit.");
    }
    chunks.push(value);
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}
