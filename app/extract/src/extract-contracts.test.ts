import { expect, test } from "vitest";

import { InvalidCourtPdfUrlError, validateCourtPdfUrl } from "./court-pdf-url";
import { sourceDocumentSha256 } from "./source-document-sha256";

test("accepts only canonical courts.go.jp PDF URLs", () => {
  expect(() =>
    validateCourtPdfUrl(new URL("https://www.courts.go.jp/assets/hanrei/hanrei-pdf-97044.pdf")),
  ).not.toThrow();
  for (const value of [
    "https://example.com/assets/hanrei/hanrei-pdf-97044.pdf",
    "https://www.courts.go.jp/hanrei/97044/detail2/index.html",
    "https://www.courts.go.jp/assets/hanrei/hanrei-pdf-97044.pdf?download=1",
  ]) {
    expect(() => validateCourtPdfUrl(new URL(value))).toThrow(InvalidCourtPdfUrlError);
  }
});

test("derives a stable source hash from the PDF bytes", async () => {
  const bytes = new TextEncoder().encode("pdf-content");
  const first = await sourceDocumentSha256(bytes);
  const second = await sourceDocumentSha256(bytes);
  const other = await sourceDocumentSha256(new TextEncoder().encode("updated-pdf-content"));

  expect(first).toBe(second);
  expect(first).not.toBe(other);
  expect(first).toMatch(/^[0-9a-f]{64}$/);
});
