import { env } from "cloudflare:workers";
import type { CrawlerQueuePayload } from "@/types";

export async function extractSearchList(
  payload: CrawlerQueuePayload,
): Promise<{ nextPageUrl: URL | null; detailPageUrls: URL[] }> {
  const res = await fetch(payload.url);
  let extractNextPageUrl: URL | null = null;
  const extractDetailsUrl: URL[] = [];
  const rewrite = new HTMLRewriter()
    .on(".search-result-table tr th a", {
      element(element) {
        const href = element.getAttribute("href") || "";
        const url = new URL(href, payload.url);
        extractDetailsUrl.push(url);
      },
    })
    .on(".pagination a[title='次へ']", {
      element() {
        const nextUrl = new URL(payload.url);
        const currentOffset = Number(nextUrl.searchParams.get("offset")) || 0;
        const nextOffset = currentOffset + 10;
        nextUrl.searchParams.append("offset", nextOffset.toString());
        extractNextPageUrl = nextUrl;
      },
    });

  await rewrite.transform(res).text();

  return {
    nextPageUrl: extractNextPageUrl,
    detailPageUrls: extractDetailsUrl,
  };
}

export async function addCrawlQueueJobs(payloads: CrawlerQueuePayload | CrawlerQueuePayload[]) {
  await env.CRAWLER_QUEUE.send(payloads);
}
