import assert from "node:assert/strict";
import { test } from "node:test";

import { InvalidCourtPdfUrlError, validateCourtPdfUrl } from "./court-pdf-url.ts";
import { sourceDocumentSha256 } from "./source-document-sha256.ts";

test("accepts only canonical courts.go.jp PDF URLs", () => {
  assert.doesNotThrow(() =>
    validateCourtPdfUrl(new URL("https://www.courts.go.jp/assets/hanrei/hanrei-pdf-97044.pdf")),
  );
  for (const value of [
    "https://example.com/assets/hanrei/hanrei-pdf-97044.pdf",
    "https://www.courts.go.jp/hanrei/97044/detail2/index.html",
    "https://www.courts.go.jp/assets/hanrei/hanrei-pdf-97044.pdf?download=1",
  ]) {
    assert.throws(() => validateCourtPdfUrl(new URL(value)), InvalidCourtPdfUrlError);
  }
});

test("derives a stable source hash from the PDF bytes", async () => {
  const bytes = new TextEncoder().encode("pdf-content");
  const first = await sourceDocumentSha256(bytes);
  const second = await sourceDocumentSha256(bytes);
  const other = await sourceDocumentSha256(new TextEncoder().encode("updated-pdf-content"));

  assert.equal(first, second);
  assert.notEqual(first, other);
  assert.match(first, /^[0-9a-f]{64}$/);
});
