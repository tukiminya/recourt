import { describe, expect, it } from "vitest";
import { InvalidSourceUrlError, parseSourceUrl } from "./source-url";

describe("article URL restrictions", () => {
  it.each([
    "http://news.example.com/article",
    "https://localhost/article",
    "https://127.0.0.1/article",
    "https://[::1]/article",
    "https://news.example.com:8443/article",
    "https://user:password@news.example.com/article",
    "https://internal.local/article",
    "https://news.example.com./article",
  ])("rejects non-public URL %s", (url) => {
    expect(() => parseSourceUrl(url)).toThrow(InvalidSourceUrlError);
  });

  it("accepts the NHK article URL without a DNS lookup", () => {
    expect(parseSourceUrl("https://news.web.nhk/newsweb/na/nd-20260822de45659").href)
      .toBe("https://news.web.nhk/newsweb/na/nd-20260822de45659");
  });
});
