import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep, WorkflowStepConfig } from "cloudflare:workers";
import {
  courtSearchResponse,
  type CourtSearchCategory,
  type CrawlerQueueMessage,
} from "@recourt/types/courts";
import { NonRetryableError } from "cloudflare:workflows";

import { appendQuery, readServiceJson } from "../service";

export type CrawlSearchParams = {
  crawlRunId: string;
  category: CourtSearchCategory;
  query: Record<string, string | string[] | undefined>;
};

const stepConfig = {
  retries: { limit: 3, delay: "5 seconds", backoff: "exponential" },
  timeout: "2 minutes",
} satisfies WorkflowStepConfig;

export class CrawlSearchWorkflow extends WorkflowEntrypoint<Env, CrawlSearchParams> {
  async run(event: WorkflowEvent<CrawlSearchParams>, step: WorkflowStep) {
    let offset: number | null = 0;
    let enqueued = 0;

    while (offset !== null) {
      const currentOffset: number = offset;
      const page: { nextOffset: number | null; enqueued: number } = await step.do(
        `fetch and enqueue page ${currentOffset}`,
        stepConfig,
        async () => {
          const url = new URL(
            `/courts/hanrei/search/${event.payload.category}`,
            "https://external-service.internal",
          );
          appendQuery(url, event.payload.query);
          if (currentOffset > 0) url.searchParams.set("offset", String(currentOffset));
          const response = await this.env.EXTERNAL_SERVICE.fetch(url);
          const result = await readServiceJson(response, courtSearchResponse, "Court search");
          if (result.category !== event.payload.category) {
            throw new NonRetryableError("Court search returned a different category");
          }
          if (
            result.nextOffset !== null &&
            (result.nextOffset <= currentOffset || result.nextOffset > 1980)
          ) {
            throw new NonRetryableError("Court search returned an invalid next offset");
          }

          const messages: MessageSendRequest<CrawlerQueueMessage>[] = result.results.map(
            (item) => ({
              body: {
                version: 1,
                crawlRunId: event.payload.crawlRunId,
                jobId: `case-${event.payload.crawlRunId}-${item.id}`,
                category: event.payload.category,
                courtDetailId: item.id,
                detailUrl: item.detailUrl,
              },
            }),
          );
          if (messages.length > 0) await this.env.CRAWLER_QUEUE.sendBatch(messages);
          return { nextOffset: result.nextOffset, enqueued: messages.length };
        },
      );
      enqueued += page.enqueued;
      offset = page.nextOffset;
    }

    return { crawlRunId: event.payload.crawlRunId, enqueued };
  }
}
