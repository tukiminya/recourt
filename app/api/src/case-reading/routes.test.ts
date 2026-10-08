import { describe, expect, it, vi } from "vitest";
vi.mock("./chat", () => ({
  streamCaseReading: vi.fn(() => new Response("event: done\ndata: {}\n\n")),
}));
import { caseReadingRoutes } from "./routes";
import { streamCaseReading } from "./chat";
const caseId = "0199aa11-1100-7000-8000-000000000001",
  documentId = "0199aa11-1100-7000-8000-000000000002";
const data = {
  case: {
    id: caseId,
    documentId,
    title: "裁判",
    description: "説明",
    courtName: "最高裁判所",
    caseNumber: "令和1(あ)1",
    decisionDate: null,
    detailUrl: "https://www.courts.go.jp/hanrei/1/detail2/index.html",
    topics: [],
    pageCount: 1,
  },
  text: {
    version: 1,
    pages: [{ page: 1, text: "判決" }],
    passages: [{ id: "p1-1", page: 1, text: "判決" }],
  },
};
function env(response: Response, success = true) {
  return {
    INTERNAL_SERVICE: { fetch: vi.fn(async () => response) },
    CHAT_LIMIT: { limit: vi.fn(async () => ({ success })) },
    VERCEL_AI_GATEWAY_API_KEY: "test",
  } as unknown as Env;
}
const request = (document = documentId) =>
  new Request(`https://api/cases/${caseId}/explain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId: document, section: "overview", depth: "standard" }),
  });
describe("case API", () => {
  it("fetches the pinned document and forwards it to the model", async () => {
    const bindings = env(Response.json(data));
    expect((await caseReadingRoutes.request(request(), undefined, bindings)).status).toBe(200);
    expect(bindings.INTERNAL_SERVICE.fetch).toHaveBeenCalledWith(
      `https://internal-service.internal/reading/cases/${caseId}/documents/${documentId}`,
      expect.anything(),
    );
    expect(streamCaseReading).toHaveBeenLastCalledWith(
      expect.objectContaining({ courtCase: data.case, text: data.text }),
    );
  });
  it("rejects missing or mismatched documents and invalid parameters", async () => {
    const bindings = env(new Response(null, { status: 404 }));
    expect((await caseReadingRoutes.request(request(), undefined, bindings)).status).toBe(404);
    expect((await caseReadingRoutes.request(request("invalid"), undefined, bindings)).status).toBe(
      400,
    );
    expect((await caseReadingRoutes.request("/cases?offset=-1", undefined, bindings)).status).toBe(
      400,
    );
  });
  it("limits paid requests before fetching source material", async () => {
    const bindings = env(Response.json(data), false);
    const response = await caseReadingRoutes.request(request(), undefined, bindings);
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(bindings.INTERNAL_SERVICE.fetch).not.toHaveBeenCalled();
  });
});
