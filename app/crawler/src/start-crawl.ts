import type { CourtSearchCategory } from "@recourt/types/courts";

import type { CrawlSearchParams } from "./workflows/crawl-search";

export async function startCrawl(
  env: Pick<Env, "CRAWL_SEARCH">,
  category: CourtSearchCategory,
  query: Record<string, string | string[] | undefined>,
  crawlRunId: string = crypto.randomUUID(),
  maxCases = 50,
  cursorKey?: string,
) {
  const params: CrawlSearchParams = {
    crawlRunId,
    category,
    query,
    maxCases,
    reading: true,
    cursorKey,
  };

  try {
    await env.CRAWL_SEARCH.create({ id: crawlRunId, params });
    return { crawlId: crawlRunId, status: "queued" as const };
  } catch (error) {
    const instance = await env.CRAWL_SEARCH.get(crawlRunId);
    const status = await instance.status();
    if (status.status === "unknown") throw error;

    return { crawlId: crawlRunId, status: "already_queued" as const };
  }
}
