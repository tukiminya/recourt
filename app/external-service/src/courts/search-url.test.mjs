import assert from "node:assert/strict";
import { test } from "node:test";

import app from "../main.ts";

async function search(path) {
  let upstreamUrl;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    upstreamUrl = new URL(url);
    return new Response("busy", { status: 429 });
  };
  try {
    const response = await app.request(`https://external-service.internal${path}`);
    return { response, upstreamUrl };
  } finally {
    globalThis.fetch = originalFetch;
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
  ]) {
    const { response, upstreamUrl } = await search(`/courts/hanrei/search/${category}?query1=賃金`);
    assert.equal(response.status, 503);
    assert.equal(upstreamUrl.pathname, `/hanrei/search${page}/index.html`);
    assert.equal(upstreamUrl.searchParams.get("query1"), "賃金");
    assert.equal(
      upstreamUrl.searchParams.get("courtCaseType"),
      page === 1 ? null : page === 7 ? "6 7" : String(page - 1),
    );
  }
});

test("Zod validates repeated selections and preserves their values", async () => {
  const { response, upstreamUrl } = await search(
    "/courts/hanrei/search/gyosei?filter%5BcaseType%5D%5B%5D=1&filter%5BcaseType%5D%5B%5D=3&offset=30",
  );
  assert.equal(response.status, 503);
  assert.deepEqual(upstreamUrl.searchParams.getAll("filter[caseType][]"), ["1", "3"]);
  assert.equal(upstreamUrl.searchParams.get("offset"), "30");
});

test("chizai view selects its own filters and fixed court category", async () => {
  const { response, upstreamUrl } = await search(
    "/courts/hanrei/search/chizai?view=chizai&filter%5BchizaiCaseType%5D%5B%5D=1",
  );
  assert.equal(response.status, 503);
  assert.equal(upstreamUrl.searchParams.get("courtCaseType"), "7");
  assert.equal(upstreamUrl.searchParams.get("view"), "chizai");

  const invalid = await search(
    "/courts/hanrei/search/chizai?view=chizai&filter%5BrightType%5D%5B%5D=1",
  );
  assert.equal(invalid.response.status, 400);
  assert.equal(invalid.upstreamUrl, undefined);
});

test("invalid category and query strings do not reach the court", async () => {
  const unknown = await search("/courts/hanrei/search/8?query1=x");
  assert.equal(unknown.response.status, 404);
  assert.equal(unknown.upstreamUrl, undefined);

  for (const query of [
    "courtCaseType=9&query1=x",
    "query1=x&offset=31",
    "query1=x&offset=2010",
    "query1=x&sort=4",
    "query1=x&query1=y",
    "offset=0",
  ]) {
    const { response, upstreamUrl } = await search(`/courts/hanrei/search/kakyusai?${query}`);
    assert.equal(response.status, 400, query);
    assert.equal(upstreamUrl, undefined);
  }
});
