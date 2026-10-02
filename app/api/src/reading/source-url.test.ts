import { beforeEach, describe, expect, it, vi } from "vitest";
import { promises as dns } from "node:dns";
import { allowedSourceHosts, InvalidSourceUrlError, parseSourceUrl } from "./source-url";

vi.mock("node:dns", () => ({
  promises: { resolve4: vi.fn(), resolve6: vi.fn() },
}));

beforeEach(() => {
  vi.mocked(dns.resolve4).mockReset().mockResolvedValue(["93.184.215.14"]);
  vi.mocked(dns.resolve6).mockReset().mockResolvedValue([]);
});

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

  it("rejects a hostname if any DNS answer is private", async () => {
    vi.mocked(dns.resolve4).mockResolvedValue(["93.184.215.14", "10.0.0.1"]);
    await expect(allowedSourceHosts("news.example.com")).rejects.toThrow(InvalidSourceUrlError);
  });

  it("does not allow a www redirect if its DNS answer is private", async () => {
    vi.mocked(dns.resolve4).mockImplementation(async (hostname) =>
      hostname === "www.news.example.com" ? ["192.168.1.4"] : ["93.184.215.14"]);
    await expect(allowedSourceHosts("news.example.com")).resolves.toEqual(["news.example.com"]);
  });
});
