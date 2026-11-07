import { describe, expect, it, vi } from "vitest";
import { reviewReasons, type ReviewReflection } from "@recourt/types";
import { reviewCatalog } from "./catalog";
import { createJudicialReviewRoutes } from "./routes";
import type { ReviewReflectionStore } from "./reflection-store";

const input: ReviewReflection = {
  requestId: "7fcbfe29-8749-4ba0-9903-28ed10424339",
  catalogVersion: reviewCatalog.version,
  caseId: "married-surnames-2021",
  reasons: ["rights", "institutions"],
};
function setup(success = true, dbUrl = "test-db") {
  const store: ReviewReflectionStore = {
    submit: vi.fn(async () => "created" as const),
    summarize: vi.fn(async () => ({
      total: 0,
      reasons: reviewReasons.map(({ id }) => ({ id, count: 0 })),
    })),
  };
  const createStore = vi.fn(() => store);
  const routes = createJudicialReviewRoutes(createStore);
  const bindings = { DB_URL: dbUrl, CHAT_LIMIT: { limit: vi.fn(async () => ({ success })) } };
  const post = (body: object = input, judge = "uga-katsuya") =>
    routes.request(
      `/judges/${judge}/reasons`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "cf-connecting-ip": "test-ip" },
        body: JSON.stringify(body),
      },
      bindings,
    );
  const get = (caseId = input.caseId, version = input.catalogVersion) =>
    routes.request(`/judges/uga-katsuya/reasons?caseId=${caseId}&version=${version}`, {}, bindings);
  return { store, createStore, post, get, bindings };
}

describe("anonymous review reasons", () => {
  it("accepts explicit selections and scopes them to the judge, case and published edition", async () => {
    const { post, store, bindings } = setup();
    const response = await post();
    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(store.submit).toHaveBeenCalledWith("uga-katsuya", input);
    expect(bindings.CHAT_LIMIT.limit).toHaveBeenCalledWith({ key: "review-reasons:test-ip" });
  });
  it("returns success for an idempotent retry and rejects a reused ID with different content", async () => {
    const { post, store } = setup();
    vi.mocked(store.submit).mockResolvedValueOnce("existing").mockResolvedValueOnce("conflict");
    expect((await post()).status).toBe(200);
    expect((await post({ ...input, reasons: ["impact"] })).status).toBe(409);
  });
  it("rejects private text, duplicate or unknown reasons, and more than three selections", async () => {
    const { post, createStore } = setup();
    for (const body of [
      { ...input, memo: "private note" },
      { ...input, reasons: ["rights", "rights"] },
      { ...input, reasons: ["unknown"] },
      { ...input, reasons: [] },
      { ...input, reasons: ["rights", "reasoning", "institutions", "impact"] },
      { ...input, requestId: "invalid" },
    ])
      expect((await post(body)).status).toBe(400);
    expect(createStore).not.toHaveBeenCalled();
  });
  it("rejects unlisted judges, cases and editions before touching the database", async () => {
    const { post, createStore, get } = setup();
    expect((await post(input, "unknown")).status).toBe(404);
    expect((await post({ ...input, caseId: "unknown-case" })).status).toBe(404);
    expect((await post({ ...input, catalogVersion: "unpublished" })).status).toBe(409);
    expect((await get(input.caseId, "unpublished")).status).toBe(409);
    expect(createStore).not.toHaveBeenCalled();
  });
  it("rate limits writes and reports unavailable storage without inventing counts", async () => {
    const limited = setup(false);
    const response = await limited.post();
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(limited.createStore).not.toHaveBeenCalled();
    const unavailable = setup(true, "");
    expect((await unavailable.get()).status).toBe(503);
    expect((await unavailable.post()).status).toBe(503);
    expect(unavailable.createStore).not.toHaveBeenCalled();
  });
  it("returns the stored distribution for exactly the requested material", async () => {
    const { get, store } = setup();
    const response = await get();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ total: 0 });
    expect(store.summarize).toHaveBeenCalledWith("uga-katsuya", input.caseId, input.catalogVersion);
  });
});
