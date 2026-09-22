import { startCrawl } from "./start-crawl";

const JST_OFFSET_MS = 9 * 60 * 60 * 1_000;
const LOOKBACK_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1_000;

const toJapaneseDate = (timestamp: number) => {
  const date = new Date(timestamp + JST_OFFSET_MS);
  const year = date.getUTCFullYear();
  const dateNumber = year * 10_000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
  const era =
    dateNumber >= 20190501
      ? { name: "令和", firstYear: 2019 }
      : dateNumber >= 19890108
        ? { name: "平成", firstYear: 1989 }
        : { name: "昭和", firstYear: 1926 };

  return {
    era: era.name,
    year: String(year - era.firstYear + 1),
    month: String(date.getUTCMonth() + 1),
    day: String(date.getUTCDate()),
  };
};

export const buildScheduledGeneralQuery = (scheduledTime: number) => {
  const from = toJapaneseDate(scheduledTime - LOOKBACK_DAYS * DAY_MS);
  const to = toJapaneseDate(scheduledTime);

  return {
    "filter[judgeDateMode]": "2",
    "filter[judgeGengoFrom]": from.era,
    "filter[judgeYearFrom]": from.year,
    "filter[judgeMonthFrom]": from.month,
    "filter[judgeDayFrom]": from.day,
    "filter[judgeGengoTo]": to.era,
    "filter[judgeYearTo]": to.year,
    "filter[judgeMonthTo]": to.month,
    "filter[judgeDayTo]": to.day,
  };
};

export async function createScheduledCrawlRunId(cron: string, scheduledTime: number) {
  const input = new TextEncoder().encode(`courts:general:${cron}:${scheduledTime}`);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", input));
  const bytes = digest.slice(0, 16);

  // UUIDv8 keeps the existing UUID API contract while carrying a custom SHA-256 value.
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function startScheduledCrawl(
  env: Pick<Env, "CRAWL_SEARCH">,
  controller: Pick<ScheduledController, "cron" | "scheduledTime">,
) {
  const crawlRunId = await createScheduledCrawlRunId(controller.cron, controller.scheduledTime);
  const result = await startCrawl(
    env,
    "general",
    buildScheduledGeneralQuery(controller.scheduledTime),
    crawlRunId,
  );

  console.log(
    JSON.stringify({
      message: "Scheduled crawl accepted",
      cron: controller.cron,
      scheduledTime: controller.scheduledTime,
      crawlRunId,
      status: result.status,
    }),
  );
}
