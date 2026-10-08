// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReadingCase, ReadingParagraph } from "@recourt/types";
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
}));
vi.mock("./api-client", () => ({
  caseApiBaseUrl: "http://localhost:8787",
  explainCase: vi.fn(),
  chatAboutCase: vi.fn(),
}));
import { explainCase, chatAboutCase } from "./api-client";
import CaseReadingExperience from "./CaseReadingExperience";
const courtCase: ReadingCase = {
  id: "0199aa11-1100-7000-8000-000000000001",
  documentId: "0199aa11-1100-7000-8000-000000000002",
  title: "この裁判",
  description: "説明",
  courtName: "裁判所",
  caseNumber: "事件番号",
  decisionDate: null,
  detailUrl: "https://www.courts.go.jp/hanrei/1/detail4/index.html",
  pageCount: 2,
  topics: [],
};
const paragraph: ReadingParagraph = {
  kind: "judgment",
  text: "本文に基づく解説",
  citations: [
    {
      documentId: courtCase.documentId,
      passageId: "p2-1",
      page: 2,
      excerpt: "裁判所の判断を示す原文",
      pdfUrl: `/api/cases/${courtCase.id}/documents/${courtCase.documentId}/pdf#page=2`,
    },
  ],
};
beforeEach(() => {
  sessionStorage.clear();
  vi.resetAllMocks();
  vi.mocked(explainCase).mockImplementation(async (_courtCase, _input, onParagraph) => {
    onParagraph(paragraph);
    return [paragraph];
  });
});
afterEach(cleanup);
describe("case reader", () => {
  it("generates by depth and opens the exact excerpt and pinned PDF page", async () => {
    render(<CaseReadingExperience courtCase={courtCase} topics="殺人" />);
    fireEvent.click(await screen.findByRole("button", { name: "根拠 · 2ページ" }));
    expect(screen.getByText(paragraph.citations[0].excerpt)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "PDFの該当ページを開く" }).getAttribute("href"),
    ).toContain(`${courtCase.documentId}/pdf#page=2`);
    fireEvent.click(screen.getByRole("button", { name: "短く" }));
    await waitFor(() =>
      expect(explainCase).toHaveBeenLastCalledWith(
        courtCase,
        { documentId: courtCase.documentId, section: "overview", depth: "short" },
        expect.any(Function),
        expect.any(AbortSignal),
      ),
    );
  });
  it("retries a failed chat without putting incomplete answers into history", async () => {
    vi.mocked(chatAboutCase)
      .mockRejectedValueOnce(new Error("通信に失敗しました"))
      .mockImplementationOnce(async (_case, _input, onParagraph) => {
        onParagraph(paragraph);
        return [paragraph];
      });
    render(<CaseReadingExperience courtCase={courtCase} topics="" />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "争点は？" } });
    fireEvent.click(screen.getByRole("button", { name: "質問を送信" }));
    fireEvent.click(await screen.findByRole("button", { name: "もう一度試す" }));
    await waitFor(() => expect(chatAboutCase).toHaveBeenCalledTimes(2));
    expect(vi.mocked(chatAboutCase).mock.calls[1][1].messages).toEqual([
      { role: "user", content: "争点は？" },
    ]);
    await waitFor(() =>
      expect(sessionStorage.getItem(`recourt:case:${courtCase.documentId}`)).toContain(
        paragraph.text,
      ),
    );
  });
  it("aborts old explanations on section change and unmount", async () => {
    const signals: AbortSignal[] = [];
    vi.mocked(explainCase).mockImplementation((_case, _input, _callback, signal) => {
      signals.push(signal);
      return new Promise(() => {});
    });
    const page = render(<CaseReadingExperience courtCase={courtCase} topics="" />);
    fireEvent.click(screen.getByRole("button", { name: "背景" }));
    expect(signals[0].aborted).toBe(true);
    page.unmount();
    expect(signals[1].aborted).toBe(true);
  });
});
