import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep, WorkflowStepConfig } from "cloudflare:workers";
import {
  courtCaseSource,
  type CrawlerQueueMessage,
  type ExtractQueueMessage,
} from "@recourt/types/courts";
import { NonRetryableError } from "cloudflare:workflows";

import { readServiceJson } from "../service";
import {
  CourtCaseIdentityError,
  courtCaseIdFromSource,
  extractWorkflowId,
} from "../court-case-identity";

const fetchConfig = {
  retries: { limit: 3, delay: "5 seconds", backoff: "exponential" },
  timeout: "2 minutes",
} satisfies WorkflowStepConfig;

const writeConfig = {
  retries: { limit: 3, delay: "5 seconds", backoff: "exponential" },
  timeout: "2 minutes",
} satisfies WorkflowStepConfig;

export class CrawlCaseWorkflow extends WorkflowEntrypoint<Env, CrawlerQueueMessage> {
  async run(event: WorkflowEvent<CrawlerQueueMessage>, step: WorkflowStep) {
    const source = await step.do("read court detail", fetchConfig, async () => {
      const url = new URL("/courts/hanrei/detail", "https://external-service.internal");
      url.searchParams.set("url", event.payload.detailUrl);
      const result = await readServiceJson(
        await this.env.EXTERNAL_SERVICE.fetch(url),
        courtCaseSource,
        "Court detail",
      );
      if (result.courtDetailId !== event.payload.courtDetailId) {
        throw new NonRetryableError("Court detail ID does not match the queued case");
      }
      return result;
    });

    const fullText = source.documents.find((document) => document.role === "full_text");
    if (!fullText) throw new NonRetryableError("The court detail has no full-text PDF");
    let courtCaseId: ReturnType<typeof courtCaseIdFromSource>;
    try {
      courtCaseId = courtCaseIdFromSource(source);
    } catch (error) {
      if (error instanceof CourtCaseIdentityError) throw new NonRetryableError(error.message);
      throw error;
    }
    const jobId = await extractWorkflowId(courtCaseId, fullText.url);

    await step.do("enqueue PDF extraction", writeConfig, async () => {
      const message: ExtractQueueMessage = {
        version: 1,
        crawlRunId: event.payload.crawlRunId,
        jobId,
        courtCaseId,
        source,
        pdfUrl: fullText.url,
      };
      await this.env.EXTRACT_QUEUE.send(message);
    });
    return { courtCaseId, extractQueued: true };
  }
}
