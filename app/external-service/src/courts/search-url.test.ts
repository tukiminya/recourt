import { expect, test, vi } from "vitest";

import app from "../main";

async function search(path: string) {
  let upstreamUrl: URL | undefined;
  const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    upstreamUrl = new URL(input instanceof Request ? input.url : input);
    return new Response("busy", { status: 429 });
  });
  try {
    const response = await app.request(`https://external-service.internal${path}`);
    return { response, upstreamUrl };
  } finally {
    fetch.mockRestore();
  }
}

test("each named endpoint targets the corresponding court search page", async () => {
  for (const [category, page] of [
    ["general", 1],
    ["saikosai", 2],
    ["kosai", 3],
    ["kakyusai", 4],
    ["gyosei", 5],
    ["rodo", 6],
    ["chizai", 7],
  ] as const) {
    const { response, upstreamUrl } = await search(`/courts/hanrei/search/${category}?query1=賃金`);
    expect(response.status).toBe(503);
    expect(upstreamUrl?.pathname).toBe(`/hanrei/search${page}/index.html`);
    expect(upstreamUrl?.searchParams.get("query1")).toBe("賃金");
    expect(upstreamUrl?.searchParams.get("courtCaseType")).toBe(
      page === 1 ? null : page === 7 ? "6 7" : String(page - 1),
    );
  }
});

test("Zod validates repeated selections and preserves their values", async () => {
  const { response, upstreamUrl } = await search(
    "/courts/hanrei/search/gyosei?filter%5BcaseType%5D%5B%5D=1&filter%5BcaseType%5D%5B%5D=3&offset=30",
  );
  expect(response.status).toBe(503);
  expect(upstreamUrl?.searchParams.getAll("filter[caseType][]")).toEqual(["1", "3"]);
  expect(upstreamUrl?.searchParams.get("offset")).toBe("30");
});

test("chizai view selects its own filters and fixed court category", async () => {
  const { response, upstreamUrl } = await search(
    "/courts/hanrei/search/chizai?view=chizai&filter%5BchizaiCaseType%5D%5B%5D=1",
  );
  expect(response.status).toBe(503);
  expect(upstreamUrl?.searchParams.get("courtCaseType")).toBe("7");
  expect(upstreamUrl?.searchParams.get("view")).toBe("chizai");

  const invalid = await search(
    "/courts/hanrei/search/chizai?view=chizai&filter%5BrightType%5D%5B%5D=1",
  );
  expect(invalid.response.status).toBe(400);
  expect(invalid.upstreamUrl).toBeUndefined();
});

test("invalid category and query strings do not reach the court", async () => {
  const unknown = await search("/courts/hanrei/search/8?query1=x");
  expect(unknown.response.status).toBe(404);
  expect(unknown.upstreamUrl).toBeUndefined();

  for (const query of [
    "courtCaseType=9&query1=x",
    "query1=x&offset=31",
    "query1=x&offset=2010",
    "query1=x&sort=4",
    "query1=x&query1=y",
    "offset=0",
  ]) {
    const { response, upstreamUrl } = await search(`/courts/hanrei/search/kakyusai?${query}`);
    expect(response.status, query).toBe(400);
    expect(upstreamUrl).toBeUndefined();
  }
});
