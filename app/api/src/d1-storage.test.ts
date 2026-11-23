import { afterAll, beforeAll, expect, it } from "vitest";
import type { ReviewReflection } from "@recourt/types";
import { openTestStorage } from "../../../packages/database/test/storage";
import { reviewCatalog } from "./judicial-review/catalog";
import { createReviewReflectionStore } from "./judicial-review/reflection-store";
import { createReadingSourceStore } from "./reading/source-store";

let storage: Awaited<ReturnType<typeof openTestStorage>>;
beforeAll(async () => {
  storage = await openTestStorage();
});
afterAll(async () => {
  await storage?.dispose();
});

it("stores article text, maps expiry to a Date, and purges only expired rows", async () => {
  const { DB } = storage.env;
  const store = createReadingSourceStore(DB);
  const article = {
    requestedUrl: "https://example.com/news",
    sourceUrl: "https://example.com/article",
    title: "記事",
    content: "本文",
    excerpt: "本文",
  };
  const expired = await store.create(article);
  const current = await store.create(article);
  expect(current.expires_at.getTime() - current.fetched_at.getTime()).toBe(60 * 60 * 1_000);

  await DB.prepare("UPDATE reading_sources SET expires_at = 0 WHERE id = ?").bind(expired.id).run();
  await store.purgeExpired();
  expect(await store.get(expired.id)).toBeNull();
  expect(await store.get(current.id)).toEqual(current);
  await store.delete(current.id);
  expect(await store.get(current.id)).toBeNull();
});

it("deduplicates reflection retries and counts reasons within their judge, case and edition", async () => {
  const store = createReviewReflectionStore(storage.env.DB);
  const input: ReviewReflection = {
    requestId: crypto.randomUUID(),
    caseId: "married-surnames-2021",
    catalogVersion: reviewCatalog.version,
    reasons: ["rights", "institutions"],
  };
  expect(await store.submit("uga-katsuya", input)).toBe("created");
  expect(await store.submit("uga-katsuya", { ...input, reasons: ["institutions", "rights"] })).toBe("existing");
  expect(await store.submit("uga-katsuya", { ...input, reasons: ["impact"] })).toBe("conflict");
  await store.submit("tokura-saburo", { ...input, requestId: crypto.randomUUID() });
  const summary = await store.summarize("uga-katsuya", input.caseId, input.catalogVersion);
  expect(summary.total).toBe(1);
  expect(Object.fromEntries(summary.reasons.map(({ id, count }) => [id, count]))).toEqual({
    rights: 1,
    reasoning: 0,
    institutions: 1,
    impact: 0,
    undecided: 0,
  });
});
