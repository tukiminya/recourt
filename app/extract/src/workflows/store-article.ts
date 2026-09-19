import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep, WorkflowStepConfig } from "cloudflare:workers";
import { toCaseArticleStorageV1 } from "@recourt/types";

import { fetchPdf } from "./store-article/fetch-pdf";
import { DEFAULT_PROMPT, generateTextFromPdf } from "./store-article/generate-text";

export type StoreArticleParams = {
  url: string;
  prompt?: string;
};

const aiRetryConfig = {
  retries: {
    limit: 2,
    delay: "10 seconds" as const,
    backoff: "exponential" as const,
  },
  timeout: "15 minutes" as const,
} satisfies WorkflowStepConfig;

export class StoreArticleWorkflow extends WorkflowEntrypoint<Env, StoreArticleParams> {
  async run(event: WorkflowEvent<StoreArticleParams>, step: WorkflowStep) {
    const prompt = event.payload.prompt?.trim() || DEFAULT_PROMPT;

    const draft = await step.do("fetch PDF and generate article", aiRetryConfig, async () => {
      const pdf = await fetchPdf(new URL(event.payload.url));
      return generateTextFromPdf({ pdf, prompt });
    });

    return await step.do("build storage article", async () =>
      toCaseArticleStorageV1({
        draft,
        id: crypto.randomUUID(),
        createdTime: new Date().toISOString(),
      }),
    );
  }
}
