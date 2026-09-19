import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep, WorkflowStepConfig } from "cloudflare:workers";
import {
  extractQueueMessage,
  LatestCaseArticleStorage,
  toCaseArticleStorageV1,
  type ExtractQueueMessage,
} from "@recourt/types";
import { NonRetryableError } from "cloudflare:workflows";

import { sourceDocumentSha256 } from "../source-document-sha256";
import { fetchPdf } from "./store-article/fetch-pdf";
import { generateCaseArticle } from "./extract-case/generate-article";

const aiConfig = {
  retries: { limit: 2, delay: "10 seconds", backoff: "exponential" },
  timeout: "15 minutes",
} satisfies WorkflowStepConfig;
const writeConfig = {
  retries: { limit: 3, delay: "5 seconds", backoff: "exponential" },
  timeout: "2 minutes",
} satisfies WorkflowStepConfig;

export class ExtractCaseWorkflow extends WorkflowEntrypoint<Env, ExtractQueueMessage> {
  async run(event: WorkflowEvent<ExtractQueueMessage>, step: WorkflowStep) {
    const payload = extractQueueMessage.parse(event.payload);

    const generated = await step.do("generate article from PDF", aiConfig, async () => {
      const pdf = await fetchPdf(new URL(payload.pdfUrl));
      const [draft, sha256] = await Promise.all([
        generateCaseArticle({
          pdf,
          source: payload.source,
          externalService: this.env.EXTERNAL_SERVICE,
          gatewayApiKey: this.env.VERCEL_AI_GATEWAY_API_KEY,
        }),
        sourceDocumentSha256(pdf),
      ]);
      return { draft, sourceDocumentSha256: sha256 };
    });

    const article = await step.do("build storage article", async () =>
      LatestCaseArticleStorage.parse(
        toCaseArticleStorageV1({
          draft: generated.draft,
          id: crypto.randomUUID(),
          createdTime: new Date().toISOString(),
        }),
      ),
    );

    return step.do("store draft revision", writeConfig, async () => {
      const response = await this.env.INTERNAL_SERVICE.fetch(
        "https://internal-service.internal/case",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            article,
            court_case_id: payload.courtCaseId,
            source_document_sha256: generated.sourceDocumentSha256,
          }),
        },
      );
      if (!response.ok) {
        const message = `Draft revision storage returned HTTP ${response.status}`;
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw new NonRetryableError(message);
        }
        throw new Error(message);
      }
      const result = (await response.json()) as { id: string };
      return { caseId: result.id, stored: true };
    });
  }
}
