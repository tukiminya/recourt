import { ConflictError, NotFoundError } from "@recourt/utils/error";
import type { CaseWithRevision } from "@recourt/types";
import { HTTPException } from "hono/http-exception";
import { describe, expect, it, vi } from "vitest";

import internalApp from "./main";
import { createCasesService, type CasesService } from "./service/cases";
import { caseId, caseWithRevision, createBody, revisionId } from "./test/fixtures";

vi.mock("./service/cases", () => ({ createCasesService: vi.fn() }));
const testEnv = {
  DB_URL: "unused",
  DRAFT_ARTICLES: {} as R2Bucket,
  PUBLISHED_ARTICLES: {} as R2Bucket,
} as Env;

function createTestApp(service: CasesService) {
  vi.mocked(createCasesService).mockReturnValue(service);
  return {
    request: (input: Request | string, init?: RequestInit) =>
      internalApp.request(input, init, testEnv),
  };
}

function createMockService(): CasesService {
  const publishedRevision: CaseWithRevision = {
    ...caseWithRevision,
    revision: {
      ...caseWithRevision.revision,
      status: "published",
      published_at: "2026-09-10T01:00:00.000Z",
    },
  };

  return {
    createCase: vi.fn(async () => caseWithRevision),
    createRevision: vi.fn(async () => caseWithRevision),
    listRevisions: vi.fn(async (_caseId, input) => ({
      id: caseId,
      revisions: [caseWithRevision.revision],
      pagination: { ...input, total: 1 },
    })),
    getArticle: vi.fn(async () => createBody.article),
    deleteRevision: vi.fn(async () => undefined),
    publishRevision: vi.fn(async () => publishedRevision),
  };
}

function jsonRequest(path: string, body: unknown) {
  return new Request(`https://internal.example${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("internal case routes", () => {
  it("creates a case and its first revision", async () => {
    const service = createMockService();
    const response = await createTestApp(service).request(jsonRequest("/case", createBody));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(caseWithRevision);
    expect(service.createCase).toHaveBeenCalledWith(createBody);
  });

  it("lists revisions using validated pagination defaults and overrides", async () => {
    const service = createMockService();
    const app = createTestApp(service);

    expect((await app.request(`/case/${caseId}`)).status).toBe(200);
    expect(service.listRevisions).toHaveBeenLastCalledWith(caseId, { limit: 20, offset: 0 });

    expect((await app.request(`/case/${caseId}?limit=5&offset=10`)).status).toBe(200);
    expect(service.listRevisions).toHaveBeenLastCalledWith(caseId, { limit: 5, offset: 10 });
  });

  it("adds, reads, deletes, and publishes a revision", async () => {
    const service = createMockService();
    const app = createTestApp(service);
    const revisionPath = `/case/${caseId}/revision/${revisionId}`;

    expect((await app.request(jsonRequest(`/case/${caseId}/revision`, createBody))).status).toBe(
      201,
    );
    expect((await app.request(revisionPath)).status).toBe(200);
    expect((await app.request(revisionPath, { method: "DELETE" })).status).toBe(204);
    expect((await app.request(`${revisionPath}/publish`, { method: "POST" })).status).toBe(200);

    expect(service.createRevision).toHaveBeenCalledWith(caseId, createBody);
    expect(service.getArticle).toHaveBeenCalledWith(caseId, revisionId);
    expect(service.deleteRevision).toHaveBeenCalledWith(caseId, revisionId);
    expect(service.publishRevision).toHaveBeenCalledWith(caseId, revisionId);
  });

  it.each([
    ["bad case UUID", "/case/not-a-uuid", undefined],
    ["bad revision UUID", `/case/${caseId}/revision/not-a-uuid`, undefined],
    ["bad limit", `/case/${caseId}?limit=0`, undefined],
    ["bad offset", `/case/${caseId}?offset=-1`, undefined],
    ["bad JSON body", "/case", { article: {} }],
    [
      "bad source document hash",
      "/case",
      { ...createBody, source_document_sha256: "not-a-sha256" },
    ],
    [
      "bad court case number",
      "/case",
      {
        ...createBody,
        court_case_id: {
          court_name: "",
          branch_name: null,
          era: "reiwa",
          year: 0,
          type: "",
          number: -1,
        },
      },
    ],
  ])("returns 400 for %s", async (_name, path, body) => {
    const service = createMockService();
    const request = body === undefined ? path : jsonRequest(path, body);
    const response = await createTestApp(service).request(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "VALIDATION_ERROR", message: "Request validation failed" },
    });
  });

  it("returns the validation envelope for malformed JSON", async () => {
    const response = await createTestApp(createMockService()).request(
      new Request("https://internal.example/case", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "VALIDATION_ERROR", message: "Request validation failed" },
    });
  });

  it("maps missing and conflicting revisions", async () => {
    const service = createMockService();
    vi.mocked(service.getArticle).mockRejectedValueOnce(new NotFoundError("Revision not found"));
    vi.mocked(service.deleteRevision).mockRejectedValueOnce(
      new ConflictError("Only draft revisions can be deleted", "REVISION_NOT_DELETABLE"),
    );
    const app = createTestApp(service);
    const revisionPath = `/case/${caseId}/revision/${revisionId}`;

    const missing = await app.request(revisionPath);
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Revision not found" },
    });

    const conflict = await app.request(revisionPath, { method: "DELETE" });
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toEqual({
      error: {
        code: "REVISION_NOT_DELETABLE",
        message: "Only draft revisions can be deleted",
      },
    });
  });

  it("preserves known HTTP status and hides unexpected failures", async () => {
    const service = createMockService();
    vi.mocked(service.createCase)
      .mockRejectedValueOnce(new HTTPException(418, { message: "teapot" }))
      .mockRejectedValueOnce(new Error("database password leaked"));
    const app = createTestApp(service);

    const known = await app.request(jsonRequest("/case", createBody));
    expect(known.status).toBe(418);
    expect(await known.json()).toEqual({ error: { code: "HTTP_ERROR", message: "teapot" } });

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const unknown = await app.request(jsonRequest("/case", createBody));
    expect(unknown.status).toBe(500);
    const unknownBody = await unknown.json();
    expect(unknownBody).toEqual({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Internal server error" },
    });
    expect(JSON.stringify(unknownBody)).not.toContain("password");
    consoleError.mockRestore();
  });

  it("uses the shared 404 response for unknown routes", async () => {
    const response = await createTestApp(createMockService()).request("/unknown");

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Route not found" },
    });
  });
});
