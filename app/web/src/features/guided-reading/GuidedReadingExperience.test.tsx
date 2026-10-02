// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const streamChat = vi.hoisted(() => vi.fn());
vi.mock("./api-client", () => ({ streamChat, ReadingRequestError: class ReadingRequestError extends Error {} }));

import GuidedReadingExperience from "./GuidedReadingExperience";

const source = {
  sourceId: "d5e59846-0bfb-43ed-ad40-0d117734286a",
  title: "ニュースの記事",
  url: "https://news.example.com/article",
  excerpt: "裁判に関するニュースの記事です。",
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
};

function renderExperience(props: Parameters<typeof GuidedReadingExperience>[0]) {
  return render(<QueryClientProvider client={new QueryClient()}><GuidedReadingExperience {...props} /></QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

describe("free-form reading conversation", () => {
  it("keeps a multi-turn conversation and its source link visible", async () => {
    streamChat.mockResolvedValueOnce("記事では、ある判断が報じられています。").mockResolvedValueOnce("簡単に言うと、記事はその判断を紹介しています。");
    renderExperience({ source, onExit: vi.fn() });
    expect(screen.getByRole("link", { name: /元記事を開く/ }).getAttribute("href")).toBe(source.url);
    expect(screen.getByText("判決は未確認")).toBeTruthy();

    const textbox = screen.getByRole("textbox", { name: "記事について質問する" });
    fireEvent.change(textbox, { target: { value: "何が起きましたか？" } });
    fireEvent.click(screen.getByRole("button", { name: "メッセージを送信" }));
    await screen.findByText("記事では、ある判断が報じられています。");

    fireEvent.change(textbox, { target: { value: "もっと簡単に" } });
    fireEvent.click(screen.getByRole("button", { name: "メッセージを送信" }));
    await screen.findByText("簡単に言うと、記事はその判断を紹介しています。");
    expect(streamChat).toHaveBeenLastCalledWith(source.sourceId, [
      { role: "user", content: "何が起きましたか？" },
      { role: "assistant", content: "記事では、ある判断が報じられています。" },
      { role: "user", content: "もっと簡単に" },
    ], expect.any(Function), expect.any(AbortSignal));
  });

  it("offers retry when generation fails", async () => {
    streamChat.mockRejectedValueOnce(new Error("返答の生成に失敗しました。")).mockResolvedValueOnce("再送後の返答です。");
    renderExperience({ source, onExit: vi.fn() });
    fireEvent.change(screen.getByRole("textbox", { name: "記事について質問する" }), { target: { value: "教えて" } });
    fireEvent.click(screen.getByRole("button", { name: "メッセージを送信" }));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "もう一度送る" }));
    await screen.findByText("再送後の返答です。");
  });

  it("stops accepting messages after the article expires", async () => {
    renderExperience({ source: { ...source, expiresAt: new Date(Date.now() - 1_000).toISOString() }, onExit: vi.fn() });
    await waitFor(() => expect(screen.queryByRole("textbox", { name: "記事について質問する" })).toBeNull());
    expect(screen.getByText(/記事の利用時間が終わりました/)).toBeTruthy();
  });
});
