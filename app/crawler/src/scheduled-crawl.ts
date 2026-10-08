import { startCrawl } from "./start-crawl";

export const initialTopics = ["同性婚", "殺人", "婚姻"] as const;
export const buildTopicQuery = (topic: string) => ({
  query1: topic,
  ...(topic === "殺人" ? { query2: "量刑" } : {}),
  sort: "1" as const,
});

export async function createScheduledCrawlRunId(cron: string, scheduledTime: number) {
  const digest = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`courts:reading:${cron}:${scheduledTime}`),
    ),
  );
  const bytes = digest.slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function startTopicCrawls(
  env: Pick<Env, "CRAWL_SEARCH">,
  runId: string,
  rotate = false,
) {
  const jobs = [];
  // General search includes both district and appellate decisions.
  const searches = [
    { topic: "同性婚", category: "general", limit: 17 },
    { topic: "殺人", category: "saikosai", limit: 5 },
    { topic: "殺人", category: "kosai", limit: 5 },
    { topic: "殺人", category: "kakyusai", limit: 7 },
    { topic: "婚姻", category: "saikosai", limit: 5 },
    { topic: "婚姻", category: "kosai", limit: 5 },
    { topic: "婚姻", category: "kakyusai", limit: 6 },
  ] as const;
  for (const { topic, category, limit } of searches) {
    const crawlRunId = await createScheduledCrawlRunId(`${runId}:${topic}:${category}`, 0);
    jobs.push(
      await startCrawl(
        env,
        category,
        buildTopicQuery(topic),
        crawlRunId,
        limit,
        rotate ? `reading-search/${topic}/${category}.json` : undefined,
      ),
    );
  }
  return jobs;
}

export async function startScheduledCrawl(
  env: Pick<Env, "CRAWL_SEARCH">,
  controller: Pick<ScheduledController, "cron" | "scheduledTime">,
) {
  const runId = await createScheduledCrawlRunId(controller.cron, controller.scheduledTime);
  const jobs = await startTopicCrawls(env, runId, true);
  console.log(JSON.stringify({ event: "scheduled_reading_crawl", runId, jobs }));
}
