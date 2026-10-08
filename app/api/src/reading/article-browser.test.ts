import { JSDOM } from "jsdom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const launch = vi.hoisted(() => vi.fn());
vi.mock("@cloudflare/puppeteer", () => ({ default: { launch } }));

import { ARTICLE_USER_AGENT, ArticleUnavailableError, extractArticle } from "./article-browser";
import { InvalidSourceUrlError } from "./source-url";

const body = "これは公開記事の本文です。判決の原文についてはまだ確認されていません。".repeat(12);
let finalUrl = "https://news.example.com/article";
let responseStatus = 200;
let html = `<title>ニュースの見出し</title><main><article><nav>案内</nav><h1>ニュースの見出し</h1><p>${body}</p><p>${body}</p></article><section><p>${"関連記事への案内".repeat(80)}</p></section></main>`;
const requestHandlers: Array<(request: { url: () => string; continue: () => Promise<void>; abort: () => Promise<void> }) => void> = [];
const setUserAgent = vi.fn();
const setRequestInterception = vi.fn();
const close = vi.fn(async () => {});
const page = {
  setUserAgent,
  setRequestInterception,
  on: vi.fn((_event: string, handler: typeof requestHandlers[number]) => requestHandlers.push(handler)),
  goto: vi.fn(async () => ({ ok: () => responseStatus === 200, status: () => responseStatus })),
  url: vi.fn(() => finalUrl),
  evaluate: vi.fn(async (callback: () => unknown) => {
    const documentBefore = globalThis.document;
    globalThis.document = new JSDOM(html).window.document;
    try {
      return callback();
    } finally {
      globalThis.document = documentBefore;
    }
  }),
};

beforeEach(() => {
  vi.clearAllMocks();
  requestHandlers.length = 0;
  finalUrl = "https://news.example.com/article";
  responseStatus = 200;
  html = `<title>ニュースの見出し</title><main><article><nav>案内</nav><h1>ニュースの見出し</h1><p>${body}</p><p>${body}</p></article><section><p>${"関連記事への案内".repeat(80)}</p></section></main>`;
  launch.mockResolvedValue({ newPage: async () => page, close });
});

describe("Browser Run article extraction", () => {
  it("sets its own UA, guards requests, and extracts article text", async () => {
    const result = await extractArticle({} as Env["BROWSER"], "https://news.example.com/article#section");
    expect(launch).toHaveBeenCalledWith(expect.anything(), { guardrails: { allowedDomains: ["news.example.com"] } });
    expect(setUserAgent).toHaveBeenCalledWith(ARTICLE_USER_AGENT);
    expect(setRequestInterception).toHaveBeenCalledWith(true);
    expect(result.title).toBe("ニュースの見出し");
    expect(result.content).toContain("これは公開記事の本文です");
    expect(result.content).not.toContain("案内");
    expect(result.requestedUrl).toBe("https://news.example.com/article");
    expect(close).toHaveBeenCalledOnce();

    const continueRequest = vi.fn(async () => {});
    const abortRequest = vi.fn(async () => {});
    const handler = requestHandlers[0];
    handler({ url: () => "http://news.example.com/private", continue: continueRequest, abort: abortRequest });
    handler({ url: () => "https://other.example.com/redirect", continue: continueRequest, abort: abortRequest });
    handler({ url: () => "https://news.example.com/image", continue: continueRequest, abort: abortRequest });
    expect(abortRequest).toHaveBeenCalledTimes(2);
    expect(continueRequest).toHaveBeenCalledOnce();
  });

  it("rejects a redirect to another hostname", async () => {
    finalUrl = "https://other.example.com/article";
    await expect(extractArticle({} as Env["BROWSER"], "https://news.example.com/article"))
      .rejects.toThrow(InvalidSourceUrlError);
  });

  it("allows only the requested hostname for an NHK article", async () => {
    const url = "https://news.web.nhk/newsweb/na/nd-20260822de45659";
    finalUrl = url;

    await extractArticle({} as Env["BROWSER"], url);

    expect(launch).toHaveBeenCalledWith(expect.anything(), { guardrails: { allowedDomains: ["news.web.nhk"] } });
    expect(page.goto).toHaveBeenCalledWith(url, { waitUntil: "domcontentloaded", timeout: 20_000 });

    const continueRequest = vi.fn(async () => {});
    const abortRequest = vi.fn(async () => {});
    requestHandlers[0]({ url: () => "https://www.news.web.nhk/article", continue: continueRequest, abort: abortRequest });
    expect(abortRequest).toHaveBeenCalledOnce();
    expect(continueRequest).not.toHaveBeenCalled();
  });

  it("rejects an NHK page that only exposes a preview behind its usage confirmation", async () => {
    finalUrl = "https://news.web.nhk/newsweb/na/nd-20260822de45659";
    html = `<title>NHK ニュース</title><main><h1>ニュースの見出し</h1><p>${body}</p><p>${body}</p></main><div id="erpc-half-modal">ご利用にあたって</div>`;

    await expect(extractArticle({} as Env["BROWSER"], "https://news.web.nhk/newsweb/na/nd-20260822de45659"))
      .rejects.toThrow("サイト側の利用確認が必要");
    expect(close).toHaveBeenCalledOnce();
  });

  it("rejects a paywalled article and an empty article", async () => {
    responseStatus = 403;
    await expect(extractArticle({} as Env["BROWSER"], "https://news.example.com/article"))
      .rejects.toThrow(ArticleUnavailableError);
    responseStatus = 200;
    html = "<title>見出し</title><article><p>短い本文</p></article>";
    await expect(extractArticle({} as Env["BROWSER"], "https://news.example.com/article"))
      .rejects.toThrow("記事本文を読み取れませんでした");
  });

  it("limits article text to 20,000 characters", async () => {
    html = `<title>長い記事</title><article><p>${"本文".repeat(12_000)}</p></article>`;
    const result = await extractArticle({} as Env["BROWSER"], "https://news.example.com/article");
    expect(result.content.length).toBe(20_000);
  });
});
