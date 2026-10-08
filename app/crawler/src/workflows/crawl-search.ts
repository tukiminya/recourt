import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep, WorkflowStepConfig } from "cloudflare:workers";
import {
  courtSearchResponse,
  type CourtSearchCategory,
  type CaseCrawlQueueMessage,
} from "@recourt/types/courts";
import { NonRetryableError } from "cloudflare:workflows";

import { searchCursor, emptyCursor, cursorAfterPage } from "../search-cursor";
import { appendQuery, readServiceJson } from "../service";

export type CrawlSearchParams = {
  crawlRunId: string;
  category: CourtSearchCategory;
  query: Record<string, string | string[] | undefined>;
  maxCases?: number;
  reading?: boolean;
  cursorKey?: string;
};

const stepConfig = {
  retries: { limit: 3, delay: "5 seconds", backoff: "exponential" },
  timeout: "2 minutes",
} satisfies WorkflowStepConfig;

export class CrawlSearchWorkflow extends WorkflowEntrypoint<Env, CrawlSearchParams> {
  async run(event: WorkflowEvent<CrawlSearchParams>, step: WorkflowStep) {
    const cursor = await step.do("load search cursor", async () => {
      const object = event.payload.cursorKey
        ? await this.env.CASE_DOCUMENTS.get(event.payload.cursorKey)
        : null;
      return object ? searchCursor.parse(await object.json()) : emptyCursor;
    });
    let offset: number | null = cursor.offset;
    let skip = cursor.skip;
    let enqueued = 0;

    const maxCases = event.payload.maxCases ?? Number.POSITIVE_INFINITY;
    while (offset !== null && enqueued < maxCases) {
      const currentOffset: number = offset;
      const remaining = maxCases - enqueued;
      const page: {
        nextOffset: number | null;
        enqueued: number;
        skip?: number;
      } = await step.do(`fetch and enqueue page ${currentOffset}`, stepConfig, async () => {
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

        const messages: MessageSendRequest<CaseCrawlQueueMessage>[] = result.results
          .slice(skip, skip + remaining)
          .map((item) => ({
            body: {
              version: event.payload.reading ? 2 : 1,
              crawlRunId: event.payload.crawlRunId,
              jobId: `case-${event.payload.crawlRunId}-${item.id}`,
              category: event.payload.category,
              courtDetailId: item.id,
              detailUrl: item.detailUrl,
            },
          }));
        if (messages.length > 0) await this.env.CRAWLER_QUEUE.sendBatch(messages);
        const next = cursorAfterPage(
          currentOffset,
          result.results.length,
          result.nextOffset,
          skip,
          messages.length,
        );
        return { nextOffset: next.offset, skip: next.skip, enqueued: messages.length };
      });
      enqueued += page.enqueued;
      offset = page.nextOffset;
      skip = page.skip ?? 0;
      if (event.payload.cursorKey) {
        const saved = offset === null ? emptyCursor : { offset, skip };
        await step.do(`save cursor ${currentOffset}`, async () => {
          await this.env.CASE_DOCUMENTS.put(event.payload.cursorKey!, JSON.stringify(saved));
          return { saved: true };
        });
      }
    }

    return { crawlRunId: event.payload.crawlRunId, enqueued };
  }
}
