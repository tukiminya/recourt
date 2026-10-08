import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";
import {
  readingExtractQueueMessage,
  READING_VERSION,
  judgmentText,
  type ReadingExtractQueueMessage,
} from "@recourt/types";
import { z } from "zod";
import { fetchPdf, PdfTooLargeError } from "./store-article/fetch-pdf";
import { sourceDocumentSha256 } from "../source-document-sha256";
import { extractJudgmentText, UnsupportedJudgmentError } from "../reading/pdf-text";
import { classifyJudgment } from "../reading/classify";

export class PrepareCaseReadingWorkflow extends WorkflowEntrypoint<
  Env,
  ReadingExtractQueueMessage
> {
  async run(event: WorkflowEvent<ReadingExtractQueueMessage>, step: WorkflowStep) {
    const payload = readingExtractQueueMessage.parse(event.payload);
    const callInternal = async (path: string, body: object) => {
      const response = await this.env.INTERNAL_SERVICE.fetch(
        `https://internal-service.internal/reading/${path}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) {
        if (
          response.status >= 400 &&
          response.status < 500 &&
          response.status !== 429 &&
          response.status !== 409
        )
          throw new NonRetryableError(`Reading storage HTTP ${response.status}`);
        throw new Error(`Reading storage HTTP ${response.status}`);
      }
      return response.json();
    };
    if (
      new Set(
        payload.source.documents
          .filter((document) => document.role === "full_text")
          .map((document) => document.url),
      ).size > 1
    ) {
      return step.do("hold multiple judgment files", async () => {
        await callInternal("documents/hold", {
          courtCaseId: payload.courtCaseId,
          source: payload.source,
          pdfUrl: payload.pdfUrl,
          reason: "MULTIPLE_PDFS",
        });
        return { status: "held", reason: "MULTIPLE_PDFS" };
      });
    }
    const artifact = await step.do(
      "archive judgment PDF",
      { retries: { limit: 3, delay: "10 seconds", backoff: "exponential" }, timeout: "2 minutes" },
      async () => {
        let pdf: Uint8Array;
        try {
          pdf = await fetchPdf(new URL(payload.pdfUrl));
        } catch (error) {
          if (!(error instanceof PdfTooLargeError)) throw error;
          await callInternal("documents/hold", {
            courtCaseId: payload.courtCaseId,
            source: payload.source,
            pdfUrl: payload.pdfUrl,
            reason: "PDF_TOO_LARGE",
          });
          return { status: "held" as const };
        }
        const sha256 = await sourceDocumentSha256(pdf);
        const prefix = `judgment/${sha256}/v${READING_VERSION}/`;
        const pdfKey = `${prefix}source.pdf`;
        await this.env.CASE_DOCUMENTS.put(pdfKey, pdf, {
          httpMetadata: { contentType: "application/pdf" },
          customMetadata: { sha256 },
        });
        return { sha256, pdfKey, textKey: `${prefix}text.json` };
      },
    );
    if ("status" in artifact) return { status: "held", reason: "PDF_TOO_LARGE" };
    const previous = await step.do("check prepared document", async () =>
      z
        .object({
          document: z
            .object({ caseId: z.uuid(), documentId: z.uuid(), status: z.string() })
            .nullable(),
        })
        .parse(
          await callInternal("documents/find", {
            courtCaseId: payload.courtCaseId,
            sha256: artifact.sha256,
            version: READING_VERSION,
          }),
        ),
    );
    if (previous.document) return { ...previous.document, duplicate: true };

    const extraction = await step.do(
      "extract page text",
      { retries: { limit: 0, delay: "1 second" }, timeout: "2 minutes" },
      async () => {
        const object = await this.env.CASE_DOCUMENTS.get(artifact.pdfKey);
        if (!object) throw new Error("Archived PDF missing");
        try {
          const text = await extractJudgmentText(new Uint8Array(await object.arrayBuffer()));
          const serialized = JSON.stringify(text);
          const textSha256 = await sourceDocumentSha256(new TextEncoder().encode(serialized));
          await this.env.CASE_DOCUMENTS.put(artifact.textKey, serialized, {
            httpMetadata: { contentType: "application/json" },
            customMetadata: { sha256: textSha256 },
          });
          return {
            status: "ready" as const,
            pageCount: text.pages.length,
            textSha256,
            holdReason: null,
          };
        } catch (error) {
          if (!(error instanceof UnsupportedJudgmentError)) throw error;
          console.log(
            JSON.stringify({
              event: "judgment_held",
              sha256: artifact.sha256,
              reason: error.reason,
            }),
          );
          return {
            status: "held" as const,
            pageCount: error.pageCount,
            textSha256: null,
            holdReason: error.reason,
          };
        }
      },
    );
    const summarySchema = z.object({
      title: z.string().min(1).max(120),
      description: z.string().min(1).max(300),
      topics: z.string().min(1).max(30).array().min(1).max(8),
    });
    const summaryKey = artifact.textKey.replace("text.json", "summary.json");
    let classificationClaim: { summary: z.infer<typeof summarySchema> | null } = { summary: null };
    if (extraction.status === "ready") {
      let acquired = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        const claim = await step.do(`claim classification ${attempt}`, async () => {
          const cached = await this.env.CASE_DOCUMENTS.get(summaryKey);
          if (cached) return { acquired: true, summary: summarySchema.parse(await cached.json()) };
          const response = await this.env.INTERNAL_SERVICE.fetch(
            "https://internal-service.internal/reading/documents/claim",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sha256: artifact.sha256,
                version: READING_VERSION,
                owner: payload.jobId,
              }),
            },
          );
          await response.body?.cancel();
          if (response.status === 409) return { acquired: false, summary: null };
          if (!response.ok) throw new Error(`Classification claim HTTP ${response.status}`);
          return { acquired: true, summary: null };
        });
        if (claim.acquired) {
          classificationClaim = claim;
          acquired = true;
          break;
        }
        await step.sleep(`wait for classification ${attempt}`, "15 seconds");
      }
      if (!acquired) throw new Error("Classification capacity timeout; retry the workflow");
    }
    const summary =
      classificationClaim.summary ??
      (extraction.status === "ready"
        ? await step.do(
            "classify judgment",
            {
              retries: { limit: 2, delay: "60 seconds", backoff: "exponential" },
              timeout: "4 minutes",
            },
            async () => {
              const cached = await this.env.CASE_DOCUMENTS.get(summaryKey);
              if (cached) return summarySchema.parse(await cached.json());
              const object = await this.env.CASE_DOCUMENTS.get(artifact.textKey);
              if (!object) throw new Error("Judgment text missing");
              try {
                const value = await classifyJudgment(
                  judgmentText.parse(await object.json()),
                  payload.source,
                  this.env.VERCEL_AI_GATEWAY_API_KEY,
                );
                await this.env.CASE_DOCUMENTS.put(summaryKey, JSON.stringify(value), {
                  httpMetadata: { contentType: "application/json" },
                });
                return value;
              } catch (error) {
                const status =
                  typeof error === "object" && error !== null && "statusCode" in error
                    ? Number(error.statusCode)
                    : 0;
                console.error(
                  JSON.stringify({
                    event: "judgment_classification_failed",
                    sha256: artifact.sha256,
                    status,
                  }),
                );
                if ([400, 401, 403, 404, 422].includes(status))
                  throw new NonRetryableError(`Classification unavailable (HTTP ${status})`);
                throw error;
              }
            },
          )
        : {
            title: payload.source.caseName ?? payload.source.caseNumber,
            description: "本文の抽出を確認する必要があります。",
            topics: [],
          });

    return step.do(
      "register reading document",
      { retries: { limit: 3, delay: "5 seconds", backoff: "exponential" }, timeout: "2 minutes" },
      async () => {
        const result = z
          .object({ caseId: z.uuid(), documentId: z.uuid(), created: z.boolean() })
          .parse(
            await callInternal("documents", {
              courtCaseId: payload.courtCaseId,
              source: payload.source,
              sha256: artifact.sha256,
              processingVersion: READING_VERSION,
              pdfKey: artifact.pdfKey,
              textKey: extraction.status === "ready" ? artifact.textKey : null,
              ...extraction,
              ...summary,
            }),
          );
        console.log(
          JSON.stringify({
            event: "judgment_prepared",
            sha256: artifact.sha256,
            status: extraction.status,
          }),
        );
        return result;
      },
    );
  }
}
