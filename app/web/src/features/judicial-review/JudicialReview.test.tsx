// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reviewCatalog } from "@recourt/api/review-catalog";
import { reviewReasons } from "@recourt/types";
import JudgeExplorer from "./JudgeExplorer";
import { CaseDossier } from "./JudgeReadingExperience";
import ReflectionWorkspace from "./ReflectionWorkspace";
import { fetchReviewReasons, shareReviewReasons } from "./api-client";

vi.mock("./api-client", () => ({ fetchReviewReasons: vi.fn(), shareReviewReasons: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    params,
    search,
  }: {
    children: React.ReactNode;
    params?: { id: string };
    search?: Record<string, string>;
  }) => <a href={`/judges/${params?.id ?? ""}?${new URLSearchParams(search)}`}>{children}</a>,
}));
const judge = reviewCatalog.judges[0];
const courtCase = reviewCatalog.cases[0];
beforeEach(() => {
  localStorage.clear();
  vi.mocked(fetchReviewReasons).mockResolvedValue({
    total: 0,
    reasons: reviewReasons.map(({ id }) => ({ id, count: 0 })),
  });
  vi.mocked(shareReviewReasons).mockResolvedValue();
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
function mountNotes(caseId = courtCase.id) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ReflectionWorkspace
        catalog={reviewCatalog}
        judge={judge}
        courtCase={reviewCatalog.cases.find((item) => item.id === caseId)!}
      />
    </QueryClientProvider>,
  );
}

describe("judge-first reading", () => {
  it("searches and resets the directory, and links a selected topic to the matching versioned case", () => {
    render(<JudgeExplorer />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "宇賀" } });
    expect(screen.getAllByRole("link", { name: "判断をたどる" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "結婚と家族" }));
    const href = screen.getByRole("link", { name: "判断をたどる" }).getAttribute("href")!;
    expect(href).toContain("married-surnames-2021");
    expect(href).toContain(reviewCatalog.version);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "掲載されていない人" } });
    expect(screen.getByText("一致する裁判官の資料はありません。")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "条件をリセット" }));
    expect(screen.getAllByRole("link", { name: "判断をたどる" })).toHaveLength(3);
  });
  it("distinguishes a dissent from disagreement with the unconstitutionality ruling and links its source", () => {
    render(<CaseDossier catalog={reviewCatalog} judge={judge} courtCase={courtCase} />);
    const opinion = screen.getByRole("article", { name: `${judge.name}の反対意見` });
    expect(within(opinion).getByText(/違憲判断には賛同/)).toBeTruthy();
    expect(
      within(opinion)
        .getByRole("link", { name: /原文で確かめる/ })
        .getAttribute("href"),
    ).toBe(`${courtCase.pdfUrl}#page=31`);
    expect(shareReviewReasons).not.toHaveBeenCalled();
  });
  it("keeps an opinion that agrees with the outcome separate from a dissent", () => {
    const marriage = reviewCatalog.cases.find((item) => item.id === "married-surnames-2021")!;
    render(<CaseDossier catalog={reviewCatalog} judge={judge} courtCase={marriage} />);
    const opinion = screen.getByRole("article", { name: "三浦 守の意見（結論に賛同）" });
    expect(within(opinion).getByText(/違憲と考えつつ/)).toBeTruthy();
  });
});

describe("optional reflections", () => {
  it("keeps a saved memo on this device and separates it by judge, case and edition", async () => {
    const view = mountNotes();
    const memo = await screen.findByRole("textbox", { name: "自分だけのメモ" });
    fireEvent.change(memo, { target: { value: "自分だけの考え" } });
    fireEvent.click(screen.getByRole("button", { name: "メモを保存" }));
    expect(screen.getByText("この端末にメモを保存しました。")).toBeTruthy();
    expect(shareReviewReasons).not.toHaveBeenCalled();
    view.unmount();
    const restored = mountNotes();
    expect(
      ((await screen.findByRole("textbox", { name: "自分だけのメモ" })) as HTMLTextAreaElement)
        .value,
    ).toBe("自分だけの考え");
    restored.unmount();
    mountNotes("married-surnames-2021");
    expect(
      ((await screen.findByRole("textbox", { name: "自分だけのメモ" })) as HTMLTextAreaElement)
        .value,
    ).toBe("");
  });
  it("shares selected reasons only and reuses the submission ID after a lost response", async () => {
    vi.mocked(shareReviewReasons).mockRejectedValueOnce(new Error("通信が途切れました。"));
    mountNotes();
    fireEvent.change(await screen.findByRole("textbox", { name: "自分だけのメモ" }), {
      target: { value: "送信しないメモ" },
    });
    expect(shareReviewReasons).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox", { name: "権利や自由の保障" }));
    fireEvent.click(screen.getByRole("button", { name: "選んだ論点だけを共有" }));
    await screen.findByText("通信が途切れました。");
    fireEvent.click(screen.getByRole("button", { name: "同じ論点をもう一度送信" }));
    await screen.findByText("選んだ論点を共有しました。メモ本文は送信していません。");
    const calls = vi.mocked(shareReviewReasons).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual(calls[1]);
    expect(calls[0][1]).toEqual({
      requestId: expect.any(String),
      reasons: ["rights"],
      caseId: courtCase.id,
      catalogVersion: reviewCatalog.version,
    });
    await waitFor(() => expect(fetchReviewReasons).toHaveBeenCalledTimes(2));
  });
  it("restores a sent receipt and does not send again on a later visit", async () => {
    const view = mountNotes();
    fireEvent.click(await screen.findByRole("checkbox", { name: "まだ考えたいこと" }));
    fireEvent.click(screen.getByRole("button", { name: "選んだ論点だけを共有" }));
    await screen.findByText("選んだ論点を共有しました。メモ本文は送信していません。");
    view.unmount();
    mountNotes();
    await screen.findByText("選んだ論点を共有しました。メモ本文は送信していません。");
    expect(shareReviewReasons).toHaveBeenCalledTimes(1);
  });
});

describe("reflection recovery", () => {
  it("restores an unfinished submission without changing its ID or sending automatically", async () => {
    vi.mocked(shareReviewReasons).mockRejectedValueOnce(new Error("通信が途切れました。"));
    const view = mountNotes();
    fireEvent.click(await screen.findByRole("checkbox", { name: "判断の理由・説明" }));
    fireEvent.click(screen.getByRole("button", { name: "選んだ論点だけを共有" }));
    await screen.findByText("通信が途切れました。");
    const original = vi.mocked(shareReviewReasons).mock.calls[0];
    view.unmount();
    mountNotes();
    const retry = await screen.findByRole("button", { name: "同じ論点をもう一度送信" });
    expect(shareReviewReasons).toHaveBeenCalledTimes(1);
    fireEvent.click(retry);
    await screen.findByText("選んだ論点を共有しました。メモ本文は送信していません。");
    expect(vi.mocked(shareReviewReasons).mock.calls[1]).toEqual(original);
  });
  it("preserves a newer private memo saved while sharing is in progress", async () => {
    let finish: () => void = () => {};
    vi.mocked(shareReviewReasons).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const view = mountNotes();
    fireEvent.click(await screen.findByRole("checkbox", { name: "暮らしへの影響" }));
    fireEvent.click(screen.getByRole("button", { name: "選んだ論点だけを共有" }));
    await screen.findByRole("button", { name: "送信しています…" });
    fireEvent.change(screen.getByRole("textbox", { name: "自分だけのメモ" }), {
      target: { value: "送信中に考えたこと" },
    });
    fireEvent.click(screen.getByRole("button", { name: "メモを保存" }));
    finish();
    await screen.findByText("選んだ論点を共有しました。メモ本文は送信していません。");
    view.unmount();
    mountNotes();
    expect(
      ((await screen.findByRole("textbox", { name: "自分だけのメモ" })) as HTMLTextAreaElement)
        .value,
    ).toBe("送信中に考えたこと");
  });
  it("reports an unavailable distribution without presenting it as zero submissions", async () => {
    vi.mocked(fetchReviewReasons).mockRejectedValue(new Error("集計を取得できませんでした。"));
    mountNotes();
    expect(await screen.findByText("集計を取得できませんでした。")).toBeTruthy();
    expect(screen.queryByText(/0件の投稿/)).toBeNull();
    expect(screen.getByRole("textbox", { name: "自分だけのメモ" })).toBeTruthy();
  });
});
