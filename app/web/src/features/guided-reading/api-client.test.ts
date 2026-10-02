import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteReadingSource, importReadingSource, ReadingRequestError, streamChat } from "./api-client";

const sourceId = "d5e59846-0bfb-43ed-ad40-0d117734286a";

beforeEach(() => vi.restoreAllMocks());

describe("reader API client", () => {
  it("shows an article retrieval error from the API", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: { message: "この記事はサイト側の制限により取得できません。" } }, { status: 422 })));
    await expect(importReadingSource("https://news.example.com/article"))
      .rejects.toThrow("この記事はサイト側の制限により取得できません。");
    expect(fetch).toHaveBeenCalledWith("http://localhost:8787/api/reading-sources", expect.objectContaining({ method: "POST", credentials: "omit" }));
  });

  it("sends source deletion to the API Worker", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })));
    await deleteReadingSource(sourceId);
    expect(fetch).toHaveBeenCalledWith(`http://localhost:8787/api/reading-sources/${sourceId}`, expect.objectContaining({ method: "DELETE", credentials: "omit" }));
  });

  it("assembles multiple SSE chunks into one answer", async () => {
    const chunks = [
      'event: delta\ndata: {"text":"記事では、"}\n\n',
      'event: delta\ndata: {"text":"こう報じています。"}\n\nevent: done\ndata: {}\n\n',
    ];
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
        controller.close();
      },
    }), { headers: { "Content-Type": "text/event-stream" } })));
    const onDelta = vi.fn();
    await expect(streamChat(sourceId, [{ role: "user", content: "何ですか？" }], onDelta)).resolves.toBe("記事では、こう報じています。");
    expect(onDelta).toHaveBeenLastCalledWith("記事では、こう報じています。");
  });

  it("rejects an interrupted SSE response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response('event: delta\ndata: {"text":"途中"}\n\n', { headers: { "Content-Type": "text/event-stream" } })));
    await expect(streamChat(sourceId, [{ role: "user", content: "何ですか？" }], vi.fn()))
      .rejects.toBeInstanceOf(ReadingRequestError);
  });

  it("passes cancellation to the API request", async () => {
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })));
    const controller = new AbortController();
    const pending = streamChat(sourceId, [{ role: "user", content: "何ですか？" }], vi.fn(), controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(fetch).toHaveBeenCalledWith("http://localhost:8787/api/chat", expect.objectContaining({ method: "POST", signal: controller.signal }));
  });
});
