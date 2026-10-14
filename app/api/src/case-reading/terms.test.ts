import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JudgmentText, ReadingCase } from "@recourt/types";

const generateText = vi.hoisted(() => vi.fn());
vi.mock("ai", () => ({
  generateText,
  createGateway: () => (name: string) => name,
  Output: { object: (value: unknown) => value },
}));
import { explainCaseTerm } from "./terms";

const courtCase: ReadingCase = {
  id: "0199aa11-1100-7000-8000-000000000001",
  documentId: "0199aa11-1100-7000-8000-000000000002",
  title: "判決",
  description: "説明",
  courtName: "最高裁判所",
  caseNumber: "令和1(あ)1",
  decisionDate: "2026-01-01",
  detailUrl: "https://www.courts.go.jp/hanrei/1/detail2/index.html",
  topics: [{ id: "殺人", label: "殺人" }],
  pageCount: 1,
};
const text: JudgmentText = {
  version: 1,
  pages: [{ page: 1, text: "裁判所は理由を示した。" }],
  passages: [{ id: "p1-1", page: 1, text: "裁判所は理由を示した。" }],
};
const base = {
  apiKey: "test",
  courtCase,
  text,
  signal: new AbortController().signal,
};

beforeEach(() => vi.clearAllMocks());

describe("case term explanations", () => {
  it("separates the general meaning from a cited case-specific usage", async () => {
    generateText.mockResolvedValue({
      output: {
        generalMeaning: "ある判断を支える理由です。",
        caseUsage: "judgment",
        caseUsageText: "この判決では、判断の理由を述べています。",
        passageIds: ["p1-1"],
      },
      usage: { totalTokens: 100 },
    });
    const result = await explainCaseTerm({
      ...base,
      input: { documentId: courtCase.documentId, term: "理由", passageIds: ["p1-1"] },
    });
    expect(result).toMatchObject({
      term: "理由",
      generalMeaning: "ある判断を支える理由です。",
      caseUsage: { kind: "judgment" },
      citations: [{ passageId: "p1-1", page: 1, excerpt: text.passages[0].text }],
    });
    expect(generateText.mock.calls[0][0].system).toContain("平易な日本語");
  });

  it("marks case usage unavailable when there is no source passage", async () => {
    generateText.mockResolvedValue({
      output: {
        generalMeaning: "一般には、特定の判断に至った考え方を指します。",
        caseUsage: "unavailable",
        caseUsageText: "この判決の提示箇所からは使われ方を確認できません。",
        passageIds: [],
      },
      usage: { totalTokens: 100 },
    });
    const result = await explainCaseTerm({
      ...base,
      input: { documentId: courtCase.documentId, term: "理由", passageIds: [] },
    });
    expect(result.caseUsage.kind).toBe("unavailable");
    expect(result.citations).toEqual([]);
  });

  it("rejects unverified passage IDs before calling the model", async () => {
    await expect(
      explainCaseTerm({
        ...base,
        input: { documentId: courtCase.documentId, term: "理由", passageIds: ["p2-1"] },
      }),
    ).rejects.toThrow("UNKNOWN_PASSAGE");
    expect(generateText).not.toHaveBeenCalled();
  });

  it("records generation failures without logging the selected term", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    generateText.mockRejectedValue(new Error("gateway unavailable"));
    await expect(
      explainCaseTerm({
        ...base,
        input: { documentId: courtCase.documentId, term: "未決勾留", passageIds: ["p1-1"] },
      }),
    ).rejects.toThrow("gateway unavailable");

    expect(log).toHaveBeenCalledOnce();
    const entry = JSON.parse(log.mock.calls[0][0] as string);
    expect(entry).toMatchObject({
      event: "case_term_explanation_failed",
      caseId: courtCase.id,
      documentId: courtCase.documentId,
      errorType: "Error",
    });
    expect(JSON.stringify(entry)).not.toContain("未決勾留");
    log.mockRestore();
  });
});
