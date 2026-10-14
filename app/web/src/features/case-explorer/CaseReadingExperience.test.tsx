// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CaseTermExplanation, ReadingCase, ReadingParagraph } from "@recourt/types";
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
}));
vi.mock("./api-client", () => ({
  caseApiBaseUrl: "http://localhost:8787",
  explainCase: vi.fn(),
  chatAboutCase: vi.fn(),
  explainCaseTerm: vi.fn(),
}));
import { explainCase, chatAboutCase, explainCaseTerm } from "./api-client";
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
const termParagraph: ReadingParagraph = {
  ...paragraph,
  text: "未決勾留の日数が刑期に算入されました。",
  termMentions: ["未決勾留"],
};
const termExplanation: CaseTermExplanation = {
  term: "未決勾留",
  generalMeaning: "判決が確定する前に、身柄を拘束されている期間です。",
  caseUsage: { kind: "judgment", text: "この判決では、その日数を刑期に含めています。" },
  citations: [paragraph.citations[0]],
};
beforeEach(() => {
  sessionStorage.clear();
  vi.resetAllMocks();
  vi.mocked(explainCase).mockImplementation(async (_courtCase, _input, onParagraph) => {
    onParagraph(paragraph);
    return [paragraph];
  });
  vi.mocked(explainCaseTerm).mockResolvedValue(termExplanation);
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
  it("opens a contextual term card and prepares a question in the existing chat", async () => {
    vi.mocked(explainCase).mockImplementationOnce(async (_courtCase, _input, onParagraph) => {
      onParagraph(termParagraph);
      return [termParagraph];
    });
    render(<CaseReadingExperience courtCase={courtCase} topics="殺人" />);
    const term = await screen.findByRole("button", { name: "未決勾留" });
    fireEvent.focus(term);
    expect(await screen.findByRole("dialog", { name: "未決勾留の用語カード" })).toBeTruthy();
    await waitFor(() =>
      expect(explainCaseTerm).toHaveBeenCalledWith(
        courtCase,
        { documentId: courtCase.documentId, term: "未決勾留", passageIds: ["p2-1"] },
        expect.any(AbortSignal),
      ),
    );
    expect(await screen.findByText(termExplanation.generalMeaning)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "この語をチャットで質問" }));
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toContain("未決勾留");
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toContain(
      termParagraph.text,
    );
  });
  it("opens by hover and click, closes with Escape, and reuses the session result", async () => {
    vi.mocked(explainCase).mockImplementation(async (_courtCase, _input, onParagraph) => {
      onParagraph(termParagraph);
      return [termParagraph];
    });
    const page = render(<CaseReadingExperience courtCase={courtCase} topics="殺人" />);
    const term = await screen.findByRole("button", { name: "未決勾留" });
    fireEvent.mouseEnter(term);
    const dialog = await screen.findByRole("dialog", { name: "未決勾留の用語カード" });
    await screen.findByText(termExplanation.generalMeaning);
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(term);
    await screen.findByRole("dialog", { name: "未決勾留の用語カード" });
    expect(explainCaseTerm).toHaveBeenCalledTimes(1);
    page.unmount();

    render(<CaseReadingExperience courtCase={courtCase} topics="殺人" />);
    fireEvent.focus(await screen.findByRole("button", { name: "未決勾留" }));
    expect(await screen.findByText(termExplanation.generalMeaning)).toBeTruthy();
    expect(explainCaseTerm).toHaveBeenCalledTimes(1);
  });
  it("retries a failed term explanation", async () => {
    vi.mocked(explainCase).mockImplementationOnce(async (_courtCase, _input, onParagraph) => {
      onParagraph(termParagraph);
      return [termParagraph];
    });
    vi.mocked(explainCaseTerm)
      .mockRejectedValueOnce(new Error("communication failed"))
      .mockResolvedValueOnce(termExplanation);
    render(<CaseReadingExperience courtCase={courtCase} topics="殺人" />);
    fireEvent.focus(await screen.findByRole("button", { name: "未決勾留" }));
    fireEvent.click(await screen.findByRole("button", { name: "再試行" }));
    expect(await screen.findByText(termExplanation.generalMeaning)).toBeTruthy();
    expect(explainCaseTerm).toHaveBeenCalledTimes(2);
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
