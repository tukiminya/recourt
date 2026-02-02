export interface CrawlerConfig {
  requestDelaySeconds: number;
  turso: {
    url: string;
    authToken?: string;
  };
  crawlRange: {
    startDate: string;
    endDate: string;
    version: string;
  };
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

const required = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
};

export const loadConfig = (): CrawlerConfig => {
  const startDate = required("CRAWL_START_DATE");
  const endDate = required("CRAWL_END_DATE");

  return {
    requestDelaySeconds: Number(process.env.CRAWL_DELAY_SECONDS ?? "1"),
    turso: {
      url: required("TURSO_DATABASE_URL"),
      authToken: process.env.TURSO_AUTH_TOKEN,
    },
    crawlRange: {
      startDate,
      endDate,
      version: process.env.CRAWL_VERSION ?? "v1",
    },
    dateRange:
      startDate && endDate
        ? {
            startDate,
            endDate,
          }
        : undefined,
  };
};
