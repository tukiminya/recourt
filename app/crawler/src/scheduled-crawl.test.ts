import { generalQuery } from "@recourt/types/courts";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  buildScheduledGeneralQuery,
  createScheduledCrawlRunId,
  startScheduledCrawl,
} from "./scheduled-crawl";

const cron = "0 18 * * *";
const scheduledTime = Date.parse("2026-09-21T18:00:00.000Z");

describe("scheduled crawl", () => {
  it("searches the previous seven days through the scheduled day in JST", () => {
    const query = buildScheduledGeneralQuery(scheduledTime);

    expect(generalQuery.safeParse(query).success).toBe(true);
    expect(query).toEqual({
      "filter[judgeDateMode]": "2",
      "filter[judgeGengoFrom]": "令和",
      "filter[judgeYearFrom]": "8",
      "filter[judgeMonthFrom]": "9",
      "filter[judgeDayFrom]": "15",
      "filter[judgeGengoTo]": "令和",
      "filter[judgeYearTo]": "8",
      "filter[judgeMonthTo]": "9",
      "filter[judgeDayTo]": "22",
    });
  });

  it("derives a stable UUID from the cron event", async () => {
    const first = await createScheduledCrawlRunId(cron, scheduledTime);
    const second = await createScheduledCrawlRunId(cron, scheduledTime);
    const nextDay = await createScheduledCrawlRunId(cron, scheduledTime + 86_400_000);

    expect(first).toBe(second);
    expect(z.string().uuid().safeParse(first).success).toBe(true);
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(nextDay).not.toBe(first);
  });

  it("starts one general search workflow", async () => {
    const create = vi.fn().mockResolvedValue({});
    const env = { CRAWL_SEARCH: { create } } as unknown as Pick<Env, "CRAWL_SEARCH">;

    await startScheduledCrawl(env, { cron, scheduledTime });

    const crawlRunId = await createScheduledCrawlRunId(cron, scheduledTime);
    expect(create).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledWith({
      id: crawlRunId,
      params: {
        crawlRunId,
        category: "general",
        query: buildScheduledGeneralQuery(scheduledTime),
      },
    });
  });

  it("accepts a redelivered cron event when its workflow already exists", async () => {
    const status = vi.fn().mockResolvedValue({ status: "running" });
    const get = vi.fn().mockResolvedValue({ status });
    const create = vi.fn().mockRejectedValue(new Error("instance already exists"));
    const env = { CRAWL_SEARCH: { create, get } } as unknown as Pick<Env, "CRAWL_SEARCH">;

    await expect(startScheduledCrawl(env, { cron, scheduledTime })).resolves.toBeUndefined();

    const crawlRunId = await createScheduledCrawlRunId(cron, scheduledTime);
    expect(get).toHaveBeenCalledWith(crawlRunId);
  });
});
