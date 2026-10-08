import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PreparedJudgment } from "@recourt/types";
const execute = vi.hoisted(() => vi.fn());
vi.mock("@recourt/database", async (original) => ({
  ...(await original<typeof import("@recourt/database")>()),
  db: () => ({ execute }),
}));
vi.mock("./cases-repository", () => ({ createCasesRepository: () => ({}) }));
import { createCaseReadingService } from "./case-reading";
const id = "0199aa11-1100-7000-8000-000000000001",
  documentId = "0199aa11-1100-7000-8000-000000000002";
const courtCase = {
  id,
  documentId,
  title: "裁判",
  description: "説明",
  courtName: "最高裁判所",
  caseNumber: "令和1(あ)1",
  decisionDate: null,
  detailUrl: "https://www.courts.go.jp/hanrei/1/detail2/index.html",
  topics: [{ id: "殺人", label: "殺人" }],
  pageCount: "2",
};
const source = {
  courtName: courtCase.courtName,
  caseNumber: courtCase.caseNumber,
  detailUrl: courtCase.detailUrl,
} as PreparedJudgment["source"];
const row = {
  case_id: id,
  id: documentId,
  text_key: "text.json",
  pdf_key: "source.pdf",
  text_sha256: "hash",
  page_count: "2",
  title: "裁判",
  description: "説明",
  decision_date: null,
  source,
  topics: courtCase.topics,
};
beforeEach(() => vi.clearAllMocks());
describe("reading storage", () => {
  it("converts Cockroach raw numeric values at the API boundary", async () => {
    execute
      .mockResolvedValueOnce({ rows: [{ id: "殺人", label: "殺人", count: "3" }] })
      .mockResolvedValueOnce({ rows: [courtCase] })
      .mockResolvedValueOnce({ rows: [{ total: "3" }] });
    const service = createCaseReadingService("unused", {} as R2Bucket);
    expect((await service.topics()).topics[0].count).toBe(3);
    const page = await service.list(["殺人"], 0);
    expect(page.total).toBe(3);
    expect(page.cases[0].pageCount).toBe(2);
  });
  it("returns the pinned source and rejects missing case-document pairs", async () => {
    const text = {
      version: 1,
      pages: [{ page: 1, text: "原文" }],
      passages: [{ id: "p1-1", page: 1, text: "原文" }],
    };
    execute.mockResolvedValueOnce({ rows: [row] }).mockResolvedValueOnce({ rows: [] });
    const service = createCaseReadingService("unused", {
      get: vi.fn(async () => ({ customMetadata: { sha256: "hash" }, json: async () => text })),
    } as unknown as R2Bucket);
    expect((await service.getDocument(id, documentId)).text).toEqual(text);
    await expect(service.getDocument(id, "different-document")).rejects.toThrow(
      "Document not found",
    );
  });
  it("serves bounded and suffix PDF ranges and rejects unsatisfiable ranges", async () => {
    execute.mockResolvedValue({ rows: [row] });
    const get = vi.fn(async () => ({ body: new Uint8Array(10), size: 100 }));
    const service = createCaseReadingService("unused", {
      head: vi.fn(async () => ({ size: 100, httpEtag: '"etag"' })),
      get,
    } as unknown as R2Bucket);
    const suffix = await service.pdf(id, documentId, new Headers({ Range: "bytes=-10" }));
    expect(suffix.status).toBe(206);
    expect(suffix.headers.get("Content-Range")).toBe("bytes 90-99/100");
    expect(get).toHaveBeenCalledWith("source.pdf", { range: { offset: 90, length: 10 } });
    const bad = await service.pdf(id, documentId, new Headers({ Range: "bytes=100-" }));
    expect(bad.status).toBe(416);
    expect(bad.headers.get("Content-Range")).toBe("bytes */100");
  });
});
