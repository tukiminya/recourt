import type { RevisionStatus } from "@recourt/types";
import { ConflictError, InternalServerError, NotFoundError } from "@recourt/utils/error";
import { describe, expect, it, vi } from "vitest";

import type { ArticleStore } from "./article-store/article-store";
import { createCasesService, type CasesRepository, type RevisionRecord } from "./cases";
import { caseId, createBody, revisionId } from "../test/fixtures";

const createdAt = new Date("2026-09-10T00:00:00.000Z");

function revision(status: RevisionStatus = "draft"): RevisionRecord {
  return {
    caseId,
    revisionId,
    title: "損害賠償請求事件（最高裁判所）",
    comments: "初稿",
    courtCaseId: createBody.court_case_id ?? null,
    articleSchemaVersion: 1,
    articleSha256: "hash",
    status,
    createdAt,
    publishedAt: status === "published" ? new Date("2026-09-10T01:00:00.000Z") : null,
  };
}

function createStore(): ArticleStore {
  return {
    putDraft: vi.fn(async () => undefined),
    getDraft: vi.fn(async () => undefined),
    getPublished: vi.fn(async () => undefined),
    publishDraft: vi.fn(async () => undefined),
    deleteDraft: vi.fn(async () => undefined),
  };
}

function createRepository(): CasesRepository {
  return {
    createCaseWithRevision: vi.fn(async (record) => ({
      ...revision(),
      ...record,
      createdAt,
      publishedAt: null,
      status: "draft",
    })),
    createRevision: vi.fn(async (record) => ({
      ...revision(),
      ...record,
      createdAt,
      publishedAt: null,
      status: "draft",
    })),
    listRevisions: vi.fn(async () => ({ rows: [revision()], total: 1 })),
    findRevision: vi.fn(async () => revision()),
    transitionRevision: vi.fn(async (_caseId, _revisionId, _from, to) => revision(to)),
    deleteRevision: vi.fn(async () => true),
  };
}

describe("case service", () => {
  it("creates IDs, derives a plain title, hashes the article, and passes the court number", async () => {
    const store = createStore();
    const repository = createRepository();
    const result = await createCasesService("unused", store, repository).createCase(createBody);

    expect(result.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.revision.title).toBe("損害賠償請求事件（最高裁判所）");
    expect(repository.createCaseWithRevision).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: result.id,
        revisionId: result.revision.id,
        courtCaseId: createBody.court_case_id,
        articleSchemaVersion: 1,
        articleSha256: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    );
    expect(store.putDraft).toHaveBeenCalledWith(
      { caseId: result.id, revisionId: result.revision.id },
      JSON.stringify(createBody.article),
      expect.stringMatching(/^[0-9a-f]{64}$/),
    );
  });

  it("cleans up the draft when DB creation fails", async () => {
    const store = createStore();
    const repository = createRepository();
    vi.mocked(repository.createCaseWithRevision).mockRejectedValueOnce(new Error("db down"));

    await expect(
      createCasesService("unused", store, repository).createCase(createBody),
    ).rejects.toBeInstanceOf(InternalServerError);
    expect(store.deleteDraft).toHaveBeenCalledOnce();
  });

  it("cleans up a possibly-written draft when R2 reports an ambiguous failure", async () => {
    const store = createStore();
    const repository = createRepository();
    vi.mocked(store.putDraft).mockRejectedValueOnce(new InternalServerError("R2 timeout"));

    await expect(
      createCasesService("unused", store, repository).createCase(createBody),
    ).rejects.toBeInstanceOf(InternalServerError);
    expect(store.deleteDraft).toHaveBeenCalledOnce();
    expect(repository.createCaseWithRevision).not.toHaveBeenCalled();
  });

  it("cleans up the draft and returns not found when adding to a missing case", async () => {
    const store = createStore();
    const repository = createRepository();
    vi.mocked(repository.createRevision).mockResolvedValueOnce(undefined);

    await expect(
      createCasesService("unused", store, repository).createRevision(caseId, createBody),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(store.deleteDraft).toHaveBeenCalledWith(expect.objectContaining({ caseId }));
  });

  it("lists revision metadata and rejects stored article hash drift", async () => {
    const store = createStore();
    const repository = createRepository();
    const service = createCasesService("unused", store, repository);

    await expect(service.listRevisions(caseId, { limit: 20, offset: 0 })).resolves.toEqual({
      id: caseId,
      revisions: [
        expect.objectContaining({
          id: revisionId,
          title: "損害賠償請求事件（最高裁判所）",
          status: "draft",
        }),
      ],
      pagination: { limit: 20, offset: 0, total: 1 },
    });

    vi.mocked(store.getDraft).mockResolvedValueOnce({
      article: createBody.article,
      serialized: JSON.stringify(createBody.article),
      sha256: "different",
    });
    await expect(service.getArticle(caseId, revisionId)).rejects.toBeInstanceOf(ConflictError);
  });

  it("publishes through the intermediate state and keeps the first published timestamp", async () => {
    const store = createStore();
    const repository = createRepository();
    const publishing = revision("publishing");
    const published = revision("published");
    vi.mocked(repository.findRevision).mockResolvedValueOnce(revision("draft"));
    vi.mocked(repository.transitionRevision)
      .mockResolvedValueOnce(publishing)
      .mockResolvedValueOnce(published);
    const service = createCasesService("unused", store, repository);

    const first = await service.publishRevision(caseId, revisionId);
    expect(repository.transitionRevision).toHaveBeenNthCalledWith(
      1,
      caseId,
      revisionId,
      "draft",
      "publishing",
    );
    expect(repository.transitionRevision).toHaveBeenNthCalledWith(
      2,
      caseId,
      revisionId,
      "publishing",
      "published",
    );
    expect(store.publishDraft).toHaveBeenCalledWith(
      { caseId, revisionId },
      published.articleSha256,
    );
    expect(first.revision.published_at).toBe("2026-09-10T01:00:00.000Z");

    vi.clearAllMocks();
    vi.mocked(repository.findRevision).mockResolvedValueOnce(published);
    const second = await service.publishRevision(caseId, revisionId);
    expect(repository.transitionRevision).not.toHaveBeenCalled();
    expect(store.publishDraft).toHaveBeenCalledOnce();
    expect(second).toEqual(first);
  });

  it("leaves publishing state resumable when R2 publication fails", async () => {
    const store = createStore();
    const repository = createRepository();
    vi.mocked(repository.findRevision).mockResolvedValueOnce(revision("publishing"));
    vi.mocked(store.publishDraft).mockRejectedValueOnce(new Error("R2 unavailable"));

    await expect(
      createCasesService("unused", store, repository).publishRevision(caseId, revisionId),
    ).rejects.toBeInstanceOf(InternalServerError);
    expect(repository.transitionRevision).not.toHaveBeenCalled();
  });

  it("leaves deleting state resumable when draft deletion fails", async () => {
    const store = createStore();
    const repository = createRepository();
    vi.mocked(repository.findRevision).mockResolvedValueOnce(revision("draft"));
    vi.mocked(repository.transitionRevision).mockResolvedValueOnce(revision("deleting"));
    vi.mocked(store.deleteDraft).mockRejectedValueOnce(new Error("R2 unavailable"));

    await expect(
      createCasesService("unused", store, repository).deleteRevision(caseId, revisionId),
    ).rejects.toBeInstanceOf(InternalServerError);
    expect(repository.deleteRevision).not.toHaveBeenCalled();
  });

  it("allows only one conditional transition to win a publish/delete race", async () => {
    const store = createStore();
    let state: RevisionStatus = "draft";
    const repository = createRepository();
    repository.findRevision = vi.fn(async () => revision(state));
    repository.transitionRevision = vi.fn(async (_caseId, _revisionId, from, to) => {
      if (state !== from) return undefined;
      state = to;
      return revision(state);
    });
    repository.deleteRevision = vi.fn(async () => {
      if (state !== "deleting") return false;
      return true;
    });
    const service = createCasesService("unused", store, repository);

    const results = await Promise.allSettled([
      service.publishRevision(caseId, revisionId),
      service.deleteRevision(caseId, revisionId),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected?.reason).toBeInstanceOf(ConflictError);
  });

  it("rejects deleting a published revision before touching R2", async () => {
    const store = createStore();
    const repository = createRepository();
    vi.mocked(repository.findRevision).mockResolvedValueOnce(revision("published"));

    await expect(
      createCasesService("unused", store, repository).deleteRevision(caseId, revisionId),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(store.deleteDraft).not.toHaveBeenCalled();
  });
});
