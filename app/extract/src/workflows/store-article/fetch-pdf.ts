import { NonRetryableError } from "cloudflare:workflows";

const PDF_MEDIA_TYPE = "application/pdf";
const OCTET_STREAM_MEDIA_TYPE = "application/octet-stream";

export async function fetchPdf(url: URL): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(url, { redirect: "follow" });

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

  return response.body;
}
