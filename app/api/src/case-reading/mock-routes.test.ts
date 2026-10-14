import { beforeEach, describe, expect, it, vi } from "vitest";
import { caseListResult, readingCase, readingTopic } from "@recourt/types";
import { z } from "zod";

vi.mock("./chat", () => ({
  streamCaseReading: vi.fn(() => new Response("event: done\ndata: {}\n\n")),
}));
vi.mock("./terms", () => ({
  explainCaseTerm: vi.fn(async ({ input }) => ({
    term: input.term,
    generalMeaning: "用語の説明",
    caseUsage: { kind: "unavailable", text: "この説明は生成処理のテスト用です。" },
    citations: [],
  })),
}));

import { caseReadingRoutes } from "./routes";
import { streamCaseReading } from "./chat";
import { explainCaseTerm } from "./terms";

const caseId = "00000000-0000-4000-8000-000000000101";
const documentId = "00000000-0000-4000-8000-000000000201";
const unknownId = "00000000-0000-4000-8000-000000000999";
function env(flag: string | undefined = "true", success = true) {
  return {
    CASE_READING_MOCK: flag,
    INTERNAL_SERVICE: { fetch: vi.fn(async () => new Response(null, { status: 503 })) },
    CHAT_LIMIT: { limit: vi.fn(async () => ({ success })) },
    VERCEL_AI_GATEWAY_API_KEY: "test",
  } as unknown as Env;
}
function post(path: string, body: object) {
  return new Request(`https://api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
const explainBody = { documentId, section: "overview", depth: "standard" };
beforeEach(() => vi.clearAllMocks());

describe("mock case data", () => {
  it("returns topics counted from the sample cases without accessing Internal", async () => {
    const bindings = env();
    const response = await caseReadingRoutes.request("/topics", undefined, bindings);
    expect(response.status).toBe(200);
    const { topics } = z.object({ topics: readingTopic.array() }).parse(await response.json());
    expect(topics[0]).toEqual({ id: "結婚", label: "結婚", count: 3 });
    expect(topics).toContainEqual({ id: "同性婚", label: "同性婚", count: 1 });
    expect(topics).toContainEqual({ id: "損害賠償", label: "損害賠償", count: 2 });
    expect(bindings.INTERNAL_SERVICE.fetch).not.toHaveBeenCalled();
  });

  it("matches any selected topic once and orders by relevance then decision date", async () => {
    const bindings = env();
    const response = await caseReadingRoutes.request(
      `/cases?${new URLSearchParams({ topics: "結婚,憲法,結婚" })}`,
      undefined,
      bindings,
    );
    const page = caseListResult.parse(await response.json());
    expect(page.total).toBe(3);
    expect(page.cases.map((c) => c.id)).toEqual([
      caseId,
      "00000000-0000-4000-8000-000000000104",
      "00000000-0000-4000-8000-000000000103",
    ]);
    const union = await caseReadingRoutes.request(
      `/cases?${new URLSearchParams({ topics: "結婚,殺人" })}`,
      undefined,
      bindings,
    );
    expect(caseListResult.parse(await union.json()).total).toBe(4);
    expect(bindings.INTERNAL_SERVICE.fetch).not.toHaveBeenCalled();
  });

  it("preserves pagination metadata and handles empty or unknown topics", async () => {
    const bindings = env();
    const page = await caseReadingRoutes.request(
      `/cases?${new URLSearchParams({ topics: "結婚", offset: "1" })}`,
      undefined,
      bindings,
    );
    const result = caseListResult.parse(await page.json());
    expect(result).toMatchObject({ total: 3, offset: 1, limit: 20 });
    expect(result.cases.map((c) => c.id)).toEqual(["00000000-0000-4000-8000-000000000103", caseId]);
    for (const path of ["/cases", "/cases?topics=unknown", "/cases?topics=結婚&offset=20"]) {
      const response = await caseReadingRoutes.request(path, undefined, bindings);
      expect(caseListResult.parse(await response.json()).cases).toEqual([]);
    }
  });

  it("returns a matching detail and rejects unknown cases and malformed queries", async () => {
    const bindings = env();
    const response = await caseReadingRoutes.request(`/cases/${caseId}`, undefined, bindings);
    const detail = readingCase.parse(await response.json());
    expect(detail).toMatchObject({ id: caseId, documentId, pageCount: 1 });
    expect(detail.title).toContain("【モック】");
    expect(detail.description).toContain("架空");
    expect(
      (await caseReadingRoutes.request(`/cases/${unknownId}`, undefined, bindings)).status,
    ).toBe(404);
    expect((await caseReadingRoutes.request("/cases/invalid", undefined, bindings)).status).toBe(
      400,
    );
    expect((await caseReadingRoutes.request("/cases?offset=-1", undefined, bindings)).status).toBe(
      400,
    );
    expect(bindings.INTERNAL_SERVICE.fetch).not.toHaveBeenCalled();
  });

  it.each(["false", "TRUE", "1", ""])("uses Internal when the flag is %j", async (flag) => {
    const bindings = env(flag);
    vi.mocked(bindings.INTERNAL_SERVICE.fetch).mockResolvedValueOnce(Response.json({ topics: [] }));
    const response = await caseReadingRoutes.request("/topics", undefined, bindings);
    expect(await response.json()).toEqual({ topics: [] });
    expect(bindings.INTERNAL_SERVICE.fetch).toHaveBeenCalledOnce();
  });

  it("uses Internal when the flag is absent, for both lists and details", async () => {
    const bindings = env();
    delete (bindings as Partial<Env>).CASE_READING_MOCK;
    const upstreamCase = {
      id: unknownId,
      documentId,
      title: "実データ",
      description: "説明",
      courtName: "裁判所",
      caseNumber: "事件番号",
      decisionDate: null,
      detailUrl: "https://example.com",
      topics: [],
      pageCount: 1,
    };
    vi.mocked(bindings.INTERNAL_SERVICE.fetch)
      .mockResolvedValueOnce(
        Response.json({ cases: [upstreamCase], total: 1, offset: 0, limit: 20 }),
      )
      .mockResolvedValueOnce(Response.json(upstreamCase));
    const list = await caseReadingRoutes.request("/cases?topics=real", undefined, bindings);
    expect(caseListResult.parse(await list.json()).cases).toEqual([upstreamCase]);
    const detail = await caseReadingRoutes.request(`/cases/${unknownId}`, undefined, bindings);
    expect(await detail.json()).toEqual(upstreamCase);
    expect(bindings.INTERNAL_SERVICE.fetch).toHaveBeenCalledTimes(2);
  });

  it.each(["explain", "chat"])(
    "passes sample source text to the normal %s generator",
    async (operation) => {
      const bindings = env();
      const body =
        operation === "chat"
          ? { ...explainBody, messages: [{ role: "user", content: "争点は何ですか？" }] }
          : explainBody;
      const response = await caseReadingRoutes.request(
        post(`/cases/${caseId}/${operation}`, body),
        undefined,
        bindings,
      );
      expect(response.status).toBe(200);
      expect(streamCaseReading).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: "test",
          courtCase: expect.objectContaining({ id: caseId, documentId }),
          text: expect.objectContaining({
            passages: expect.arrayContaining([
              expect.objectContaining({ id: "p1-2", text: expect.stringContaining("婚姻届") }),
            ]),
          }),
        }),
      );
      expect(bindings.CHAT_LIMIT.limit).toHaveBeenCalledOnce();
      expect(bindings.INTERNAL_SERVICE.fetch).not.toHaveBeenCalled();
    },
  );

  it("passes verified sample passages to the normal term generator", async () => {
    const bindings = env();
    const input = { documentId, term: "損害賠償", passageIds: ["p1-2"] };
    const response = await caseReadingRoutes.request(
      post(`/cases/${caseId}/terms/explain`, input),
      undefined,
      bindings,
    );
    expect(response.status).toBe(200);
    expect(explainCaseTerm).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: "test", input }),
    );
    expect(bindings.INTERNAL_SERVICE.fetch).not.toHaveBeenCalled();
  });

  it("keeps document matching, passage validation and rate limits in mock mode", async () => {
    const bindings = env();
    expect(
      (
        await caseReadingRoutes.request(
          post(`/cases/${caseId}/explain`, { ...explainBody, documentId: unknownId }),
          undefined,
          bindings,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await caseReadingRoutes.request(
          post(`/cases/${caseId}/terms/explain`, {
            documentId,
            term: "判決",
            passageIds: ["p9-1"],
          }),
          undefined,
          bindings,
        )
      ).status,
    ).toBe(400);
    const limited = env("true", false);
    const response = await caseReadingRoutes.request(
      post(`/cases/${caseId}/explain`, explainBody),
      undefined,
      limited,
    );
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(streamCaseReading).not.toHaveBeenCalled();
    expect(explainCaseTerm).not.toHaveBeenCalled();
  });

  it("leaves PDF requests on the normal Internal service", async () => {
    const bindings = env();
    vi.mocked(bindings.INTERNAL_SERVICE.fetch).mockResolvedValueOnce(
      new Response("pdf", {
        headers: { "Content-Type": "application/pdf" },
      }),
    );
    const response = await caseReadingRoutes.request(
      `/cases/${caseId}/documents/${documentId}/pdf`,
      undefined,
      bindings,
    );
    expect(await response.text()).toBe("pdf");
    expect(bindings.INTERNAL_SERVICE.fetch).toHaveBeenCalledWith(
      `https://internal-service.internal/reading/cases/${caseId}/documents/${documentId}/pdf`,
      expect.anything(),
    );
  });
});
