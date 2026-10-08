import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReadingCase, JudgmentText } from "@recourt/types";
const streamText = vi.hoisted(() => vi.fn());
vi.mock("ai", () => ({
  streamText,
  createGateway: () => (name: string) => name,
  Output: { array: (value: unknown) => value },
}));
import { caseReadingPrompt, depthForReply, resolveParagraph, streamCaseReading } from "./chat";
export const courtCase: ReadingCase = {
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
export const text: JudgmentText = {
  version: 1,
  pages: [{ page: 1, text: "当事者は主張した。裁判所は認定した。" }],
  passages: [{ id: "p1-1", page: 1, text: "当事者は主張した。裁判所は認定した。" }],
};
const paragraph = {
  kind: "judgment" as const,
  text: "裁判所の判断を説明します。",
  passageIds: ["p1-1"],
};
beforeEach(() => vi.clearAllMocks());
describe("grounded case reading", () => {
  it("rejects nonexistent evidence and claims without evidence", () => {
    expect(() => resolveParagraph({ ...paragraph, passageIds: ["p2-1"] }, courtCase, text)).toThrow(
      "UNKNOWN_PASSAGE",
    );
    expect(() => resolveParagraph({ ...paragraph, passageIds: [] }, courtCase, text)).toThrow();
    expect(resolveParagraph(paragraph, courtCase, text).citations[0]).toEqual({
      documentId: courtCase.documentId,
      passageId: "p1-1",
      page: 1,
      excerpt: text.pages[0].text,
      pdfUrl: `/api/cases/${courtCase.id}/documents/${courtCase.documentId}/pdf#page=1`,
    });
  });
  it("streams only verified paragraphs and carries depth and history", async () => {
    streamText.mockReturnValue({
      elementStream: (async function* () {
        yield paragraph;
      })(),
      output: Promise.resolve([paragraph]),
      usage: Promise.resolve({ totalTokens: 10 }),
    });
    const result = await streamCaseReading({
      apiKey: "test",
      courtCase,
      text,
      section: "reason",
      depth: "detailed",
      messages: [{ role: "user", content: "もっと簡単に" }],
      signal: new AbortController().signal,
    }).text();
    expect(result).toContain("event: paragraph");
    expect(result).toContain(text.pages[0].text);
    expect(result).toContain("event: done");
    const options = streamText.mock.calls[0][0];
    expect(options.messages.at(-1).content).toBe("もっと簡単に");
    expect(options.system).toContain("詳しく");
    expect(options.system).toContain("基本の詳しさ: 短く");
    expect(caseReadingPrompt("overview", "short")).toContain("当事者の主張");
  });
  it("uses a requested depth for this reply and returns to the selected depth next time", () => {
    const history = [
      { role: "user" as const, content: "もっと簡単に" },
      { role: "assistant" as const, content: "短い説明" },
      { role: "user" as const, content: "なぜそう判断した？" },
    ];
    expect(depthForReply("detailed", history)).toBe("detailed");
    expect(depthForReply("short", [{ role: "user", content: "もっと詳しく教えて" }])).toBe(
      "detailed",
    );
  });
  it("emits an error instead of an invalid source or success", async () => {
    streamText.mockReturnValue({
      elementStream: (async function* () {
        yield { ...paragraph, passageIds: ["fake"] };
      })(),
      output: Promise.resolve([]),
    });
    const result = await streamCaseReading({
      apiKey: "test",
      courtCase,
      text,
      section: "overview",
      depth: "standard",
      signal: new AbortController().signal,
    }).text();
    expect(result).toContain("event: error");
    expect(result).not.toContain("event: paragraph");
    expect(result).not.toContain("event: done");
  });
  it("aborts generation on client disconnect", async () => {
    let signal: AbortSignal;
    streamText.mockImplementation((options) => {
      signal = options.abortSignal;
      return {
        elementStream: (async function* () {
          yield paragraph;
          await new Promise<void>((resolve) =>
            signal.addEventListener("abort", () => resolve(), { once: true }),
          );
        })(),
        output: Promise.resolve([paragraph]),
        usage: Promise.resolve({}),
      };
    });
    const reader = streamCaseReading({
      apiKey: "test",
      courtCase,
      text,
      section: "overview",
      depth: "standard",
      signal: new AbortController().signal,
    }).body!.getReader();
    await reader.read();
    await reader.cancel();
    expect(signal!.aborted).toBe(true);
  });
});
