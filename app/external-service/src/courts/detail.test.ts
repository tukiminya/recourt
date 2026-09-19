import { expect, test } from "vitest";

import { InvalidCourtDetailUrlError, validateCourtDetailUrl } from "./detail";

test("accepts only canonical courts.go.jp detail URLs", () => {
  expect(
    validateCourtDetailUrl("https://www.courts.go.jp/hanrei/97044/detail2/index.html"),
  ).toEqual({
    url: new URL("https://www.courts.go.jp/hanrei/97044/detail2/index.html"),
    courtDetailId: "97044",
  });

  for (const value of [
    "https://example.com/hanrei/97044/detail2/index.html",
    "https://www.courts.go.jp.evil.example/hanrei/97044/detail2/index.html",
    "https://www.courts.go.jp/hanrei/97044/detail2/index.html?next=https://example.com",
    "https://www.courts.go.jp/assets/hanrei/hanrei-pdf-97044.pdf",
  ]) {
    expect(() => validateCourtDetailUrl(value)).toThrow(InvalidCourtDetailUrlError);
  }
});
