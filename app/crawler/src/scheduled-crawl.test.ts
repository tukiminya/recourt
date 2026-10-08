import { generalQuery } from "@recourt/types/courts";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { buildTopicQuery, createScheduledCrawlRunId, startScheduledCrawl } from "./scheduled-crawl";
const cron = "0 18 * * *";
const scheduledTime = Date.parse("2026-09-21T18:00:00.000Z");
describe("scheduled reading crawl", () => {
  it("re-searches topics without excluding newly published older judgments", () => {
    expect(generalQuery.safeParse(buildTopicQuery("同性婚")).success).toBe(true);
    expect(buildTopicQuery("同性婚")).toEqual({ query1: "同性婚", sort: "1" });
  });
  it("derives stable distinct UUIDs", async () => {
    const id = await createScheduledCrawlRunId(cron, scheduledTime);
    expect(z.uuid().safeParse(id).success).toBe(true);
    expect(await createScheduledCrawlRunId(cron, scheduledTime)).toBe(id);
    expect(await createScheduledCrawlRunId(cron, scheduledTime + 86_400_000)).not.toBe(id);
  });
  it("caps the topic and court searches at 50 total sources", async () => {
    const create = vi.fn().mockResolvedValue({});
    await startScheduledCrawl(
      { CRAWL_SEARCH: { create } } as unknown as Pick<Env, "CRAWL_SEARCH">,
      { cron, scheduledTime },
    );
    expect(create).toHaveBeenCalledTimes(7);
    expect(create.mock.calls.reduce((sum, [input]) => sum + input.params.maxCases, 0)).toBe(50);
    expect(create.mock.calls.every(([input]) => input.params.reading === true)).toBe(true);
  });
  it("accepts redelivered cron events", async () => {
    const create = vi.fn().mockRejectedValue(new Error("instance already exists"));
    const get = vi
      .fn()
      .mockResolvedValue({ status: vi.fn().mockResolvedValue({ status: "running" }) });
    await expect(
      startScheduledCrawl(
        { CRAWL_SEARCH: { create, get } } as unknown as Pick<Env, "CRAWL_SEARCH">,
        { cron, scheduledTime },
      ),
    ).resolves.toBeUndefined();
    expect(get).toHaveBeenCalledTimes(7);
  });
});
