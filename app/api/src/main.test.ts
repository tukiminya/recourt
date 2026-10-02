import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.hoisted(() => vi.fn());
const deleteSource = vi.hoisted(() => vi.fn());
const create = vi.hoisted(() => vi.fn());
const purgeExpired = vi.hoisted(() => vi.fn());
const extractArticle = vi.hoisted(() => vi.fn());
const streamConversation = vi.hoisted(() => vi.fn());

vi.mock("./reading/source-store", () => ({
  createReadingSourceStore: () => ({ get, delete: deleteSource, create, purgeExpired }),
}));
vi.mock("./reading/article-browser", () => ({
  ArticleUnavailableError: class ArticleUnavailableError extends Error { status = 422; },
  extractArticle,
}));
vi.mock("./reading/chat", () => ({ streamConversation }));

import handler from "./main";

const sourceId = "d5e59846-0bfb-43ed-ad40-0d117734286a";
const source = {
  id: sourceId,
  source_url: "https://news.example.com/article",
  title: "記事",
  content: "公開記事の本文",
  expires_at: new Date(Date.now() + 60_000),
};
const env = {
  WEB_ORIGIN: "https://recourt-v1.tuki.dev",
  DB_URL: "postgres://unused",
  VERCEL_AI_GATEWAY_API_KEY: "test",
  IMPORT_LIMIT: { limit: async () => ({ success: true }) },
  CHAT_LIMIT: { limit: async () => ({ success: true }) },
} as unknown as Env;
const ctx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() } as unknown as ExecutionContext;

beforeEach(() => {
  vi.clearAllMocks();
  get.mockResolvedValue(source);
  deleteSource.mockResolvedValue(undefined);
  create.mockResolvedValue({ ...source, expires_at: new Date(Date.now() + 3_600_000) });
  extractArticle.mockResolvedValue({ requestedUrl: source.source_url, sourceUrl: source.source_url, title: source.title, content: source.content, excerpt: "公開記事" });
  streamConversation.mockReturnValue(new Response("event: done\ndata: {}\n\n", { headers: { "Content-Type": "text/event-stream" } }));
});

function post(path: string, data: object) {
  return handler.fetch(new Request(`https://recourt.test${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }) as Parameters<typeof handler.fetch>[0], env, ctx);
}

describe("reading API", () => {
  it("allows the frontend preflight and streams with CORS headers", async () => {
    const preflight = await handler.fetch(new Request("https://api.recourt-v1.tuki.dev/api/chat", {
      method: "OPTIONS",
      headers: { Origin: "https://recourt-v1.tuki.dev", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" },
    }) as Parameters<typeof handler.fetch>[0], env, ctx);
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("Access-Control-Allow-Origin")).toBe("https://recourt-v1.tuki.dev");
    expect(preflight.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    expect(preflight.headers.get("Access-Control-Allow-Methods")).toContain("DELETE");
    expect(preflight.headers.get("Access-Control-Allow-Headers")).toContain("Content-Type");

    const response = await handler.fetch(new Request("https://api.recourt-v1.tuki.dev/api/chat", {
      method: "POST",
      headers: { Origin: "https://recourt-v1.tuki.dev", "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId, messages: [{ role: "user", content: "質問" }] }),
    }) as Parameters<typeof handler.fetch>[0], env, ctx);
    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://recourt-v1.tuki.dev");
    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
  });

  it("rejects requests from other origins before any work", async () => {
    const preflight = await handler.fetch(new Request("https://api.recourt-v1.tuki.dev/api/reading-sources", {
      method: "OPTIONS",
      headers: { Origin: "https://other.example", "Access-Control-Request-Method": "POST" },
    }) as Parameters<typeof handler.fetch>[0], env, ctx);
    expect(preflight.status).toBe(403);

    const response = await handler.fetch(new Request("https://api.recourt-v1.tuki.dev/api/reading-sources", {
      method: "POST",
      headers: { Origin: "https://other.example", "Content-Type": "application/json" },
      body: JSON.stringify({ url: source.source_url }),
    }) as Parameters<typeof handler.fetch>[0], env, ctx);
    expect(response.status).toBe(403);
    expect(response.headers.get("Access-Control-Allow-Origin")).not.toBe("https://other.example");
    expect(extractArticle).not.toHaveBeenCalled();
  });

  it("imports articles and returns metadata without article content", async () => {
    const response = await post("/api/reading-sources", { url: source.source_url });
    expect(response.status).toBe(201);
    const result = await response.json() as Record<string, unknown>;
    expect(result).toMatchObject({ sourceId, title: "記事", url: source.source_url, excerpt: "公開記事" });
    expect(result).not.toHaveProperty("content");
  });

  it("returns 410 and removes expired article sources", async () => {
    get.mockResolvedValue({ ...source, expires_at: new Date(Date.now() - 1_000) });
    const response = await post("/api/chat", { sourceId, messages: [{ role: "user", content: "これは何ですか？" }] });
    expect(response.status).toBe(410);
    expect(deleteSource).toHaveBeenCalledWith(sourceId);
    expect(streamConversation).not.toHaveBeenCalled();
  });

  it("rejects malformed or excessive chat input before generation", async () => {
    const excessiveMessages = Array.from({ length: 21 }, (_, index) => ({ role: index % 2 ? "assistant" : "user", content: "質問" }));
    expect((await post("/api/chat", { sourceId, messages: excessiveMessages })).status).toBe(400);
    expect((await post("/api/chat", { sourceId, messages: [{ role: "user", content: "x".repeat(4_001) }] })).status).toBe(400);
    expect(streamConversation).not.toHaveBeenCalled();
  });

  it("passes the source and browser-supplied history to the SSE generator", async () => {
    const messages = [
      { role: "user", content: "何が起きましたか？" },
      { role: "assistant", content: "記事ではこう報じています。" },
      { role: "user", content: "もっと簡単に" },
    ];
    const response = await post("/api/chat", { sourceId, messages });
    expect(response.status).toBe(200);
    expect(streamConversation).toHaveBeenCalledWith({ apiKey: "test", source, messages });
  });

  it("deletes a source on request", async () => {
    const response = await handler.fetch(new Request(`https://recourt.test/api/reading-sources/${sourceId}`, { method: "DELETE" }) as Parameters<typeof handler.fetch>[0], env, ctx);
    expect(response.status).toBe(204);
    expect(deleteSource).toHaveBeenCalledWith(sourceId);
  });
});
