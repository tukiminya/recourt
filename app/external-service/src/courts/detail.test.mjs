import assert from "node:assert/strict";
import { test } from "node:test";

import { InvalidCourtDetailUrlError, validateCourtDetailUrl } from "./detail.ts";

test("accepts only canonical courts.go.jp detail URLs", () => {
  assert.deepEqual(
    validateCourtDetailUrl("https://www.courts.go.jp/hanrei/97044/detail2/index.html"),
    {
      url: new URL("https://www.courts.go.jp/hanrei/97044/detail2/index.html"),
      courtDetailId: "97044",
    },
  );

  for (const value of [
    "https://example.com/hanrei/97044/detail2/index.html",
    "https://www.courts.go.jp.evil.example/hanrei/97044/detail2/index.html",
    "https://www.courts.go.jp/hanrei/97044/detail2/index.html?next=https://example.com",
    "https://www.courts.go.jp/assets/hanrei/hanrei-pdf-97044.pdf",
  ]) {
    assert.throws(() => validateCourtDetailUrl(value), InvalidCourtDetailUrlError);
  }
});
