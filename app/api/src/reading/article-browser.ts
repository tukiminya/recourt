import puppeteer from "@cloudflare/puppeteer";
import { InvalidSourceUrlError, parseSourceUrl } from "./source-url";

export const ARTICLE_USER_AGENT = "RecourtReader/0.1 (+https://recourt-v1.tuki.dev/)";
const MAX_CONTENT_LENGTH = 20_000;

export class ArticleUnavailableError extends Error {
  constructor(message: string, readonly status = 422) {
    super(message);
  }
}

export type ExtractedArticle = {
  requestedUrl: string;
  sourceUrl: string;
  title: string;
  content: string;
  excerpt: string;
};

export async function extractArticle(browserBinding: Env["BROWSER"], input: string): Promise<ExtractedArticle> {
  const requested = parseSourceUrl(input);
  const hosts = [requested.hostname];
  let browser: Awaited<ReturnType<typeof puppeteer.launch>>;
  try {
    browser = await puppeteer.launch(browserBinding, {
      guardrails: { allowedDomains: hosts },
    });
  } catch {
    throw new ArticleUnavailableError("記事の読み込みを開始できませんでした。しばらくしてからお試しください。", 503);
  }

  try {
    const page = await browser.newPage();
    await page.setUserAgent(ARTICLE_USER_AGENT);
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      let permitted = false;
      try {
        const target = new URL(request.url());
        permitted = target.protocol === "https:" && hosts.includes(target.hostname);
      } catch {
        // Reject non-web schemes and malformed request URLs.
      }
      if (permitted) {
        void request.continue().catch(() => {});
      } else {
        void request.abort().catch(() => {});
      }
    });
    const response = await page.goto(requested.href, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });
    if (!response || !response.ok()) {
      const status = response?.status();
      if (status === 401 || status === 403) {
        throw new ArticleUnavailableError("この記事はサイト側の制限により取得できません。", 422);
      }
      if (status === 429) {
        throw new ArticleUnavailableError("記事サイトへのアクセスが制限されています。しばらくしてからお試しください。", 503);
      }
      throw new ArticleUnavailableError("記事を取得できませんでした。公開記事のURLかご確認ください。", 502);
    }

    const finalUrl = parseSourceUrl(page.url());
    if (!hosts.includes(finalUrl.hostname)) {
      throw new InvalidSourceUrlError("別のサイトへ移動する記事URLには対応していません。");
    }

    const extracted = await page.evaluate(() => {
      const accessGate = document.querySelector("#erpc-half-modal") !== null;
      const articles = Array.from(document.querySelectorAll("article"));
      const candidates = articles.length > 0 ? articles : Array.from(document.querySelectorAll("main, [role='main']"));
      const root = candidates.sort((a, b) => (b.textContent?.length ?? 0) - (a.textContent?.length ?? 0))[0] ?? document.body;
      const clone = root.cloneNode(true) as Element;
      clone.querySelectorAll("script, style, nav, header, footer, aside, form, iframe, noscript, button, [aria-hidden='true']")
        .forEach((element) => element.remove());
      const paragraphs = Array.from(clone.querySelectorAll("h1, h2, h3, p, blockquote, li"))
        .map((element) => element.textContent?.replace(/\s+/g, " ").trim() ?? "")
        .filter((text) => text.length >= 12);
      const content = paragraphs.length >= 3
        ? paragraphs.join("\n\n")
        : (clone.textContent ?? "").replace(/\s+/g, " ").trim();
      const title =
        document.querySelector<HTMLMetaElement>("meta[property='og:title']")?.content ||
        document.querySelector("h1")?.textContent ||
        document.title;
      return { title: title?.replace(/\s+/g, " ").trim() ?? "", content, accessGate };
    });

    if (extracted.accessGate) {
      throw new ArticleUnavailableError("この記事はサイト側の利用確認が必要なため取得できません。", 422);
    }

    const title = extracted.title.slice(0, 300);
    const content = extracted.content.slice(0, MAX_CONTENT_LENGTH).trim();
    if (!title || content.length < 160) {
      throw new ArticleUnavailableError("記事本文を読み取れませんでした。公開記事のURLをお試しください。");
    }

    return {
      requestedUrl: requested.href,
      sourceUrl: finalUrl.href,
      title,
      content,
      excerpt: content.slice(0, 240),
    };
  } catch (error) {
    if (error instanceof ArticleUnavailableError || error instanceof InvalidSourceUrlError) throw error;
    throw new ArticleUnavailableError("記事の読み込みに失敗しました。しばらくしてからお試しください。", 502);
  } finally {
    await browser.close().catch(() => {});
  }
}
