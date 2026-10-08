// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CaseExplorer from "./CaseExplorer";
import { fetchCases, fetchTopics } from "./api-client";
vi.mock("./api-client", () => ({ fetchCases: vi.fn(), fetchTopics: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, search }: { children: React.ReactNode; search: { topics: string } }) => (
    <a href={`/?topics=${search.topics}`}>{children}</a>
  ),
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
function TestPage() {
  const [topics, setTopics] = useState<string[]>([]);
  return <CaseExplorer selectedTopics={topics} onTopicsChange={setTopics} />;
}
function mount() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <TestPage />
    </QueryClientProvider>,
  );
}
describe("topic explorer", () => {
  it("gets real topic counts, combines choices, and preserves selection in the case link", async () => {
    vi.mocked(fetchTopics).mockResolvedValue([
      { id: "同性婚", label: "同性婚", count: 3 },
      { id: "結婚", label: "結婚", count: 7 },
    ]);
    vi.mocked(fetchCases).mockResolvedValue({
      cases: [
        {
          id: "case-id",
          documentId: "doc-id",
          title: "婚姻をめぐる判断",
          description: "一覧用の説明",
          courtName: "札幌高等裁判所",
          caseNumber: "令和4年(ネ)第194号",
          decisionDate: "2024-03-14",
          detailUrl: "https://www.courts.go.jp/hanrei/1/detail4/index.html",
          topics: [{ id: "同性婚", label: "同性婚" }],
          pageCount: 10,
        },
      ],
      total: 7,
      offset: 0,
      limit: 20,
    });
    mount();
    expect(screen.getByText("トピックを選ぶと、関連する裁判がここに表示されます。")).toBeTruthy();
    fireEvent.click(await screen.findByRole("button", { name: "同性婚3" }));
    await screen.findByText("7件の裁判が見つかりました");
    fireEvent.click(screen.getByRole("button", { name: "結婚7" }));
    await waitFor(() =>
      expect(fetchCases).toHaveBeenLastCalledWith(["同性婚", "結婚"], 0, expect.any(AbortSignal)),
    );
    expect(screen.getByRole("button", { name: "同性婚3" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(
      (await screen.findByRole("link", { name: "一緒に読む" })).getAttribute("href"),
    ).toContain("同性婚,結婚");
  });
  it("retries a failed topic request", async () => {
    vi.mocked(fetchTopics).mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce([]);
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "もう一度読み込む" }));
    expect(await screen.findByText(/読める判例を準備しています/)).toBeTruthy();
  });
});
