import { createGateway, generateText, Output, stepCountIs } from "ai";
import {
  CaseArticleGeneration,
  previousJudgmentResponse,
  wikipediaSearchResponse,
  type CaseArticleGeneration as CaseArticleGenerationData,
  type CourtCaseSource,
} from "@recourt/types";
import { z } from "zod";

import { readServiceJson } from "../../service";

const DEFAULT_PROMPT =
  "判例PDFを読み、一般の読者が事実関係、争点、裁判所の理由、結論と影響を正確に理解できる日本語の記事を作成してください。PDFにない事実は推測しないでください。Wikipediaと前審検索は補助資料としてのみ使い、判決本文と矛盾する場合は判決本文を優先してください。";

const metadataForPrompt = (source: CourtCaseSource) => ({
  caseNumber: source.caseNumber,
  caseName: source.caseName,
  decisionDate: source.decisionDate,
  courtName: source.courtName,
  judgmentType: source.judgmentType,
  result: source.result,
  holding: source.holding,
  summary: source.summary,
  referencedLaws: source.referencedLaws,
  originalCaseNumber: source.originalCaseNumber,
});

export async function generateCaseArticle({
  pdf,
  source,
  externalService,
  gatewayApiKey,
}: {
  pdf: Uint8Array;
  source: CourtCaseSource;
  externalService: Fetcher;
  gatewayApiKey: string;
}): Promise<CaseArticleGenerationData> {
  const gateway = createGateway({ apiKey: gatewayApiKey });
  const result = await generateText({
    model: gateway("openai/gpt-5.6-sol"),
    output: Output.object({
      schema: CaseArticleGeneration,
      name: "case_article_generation",
      description: "判例PDFから作成した判例解説記事の意味的な構造。",
    }),
    tools: {
      searchWikipedia: {
        description: "日本語版Wikipediaを検索し、法律用語や事件の背景を確認する。",
        inputSchema: z.object({
          query: z.string().trim().min(1).max(200),
          limit: z.number().int().min(1).max(5).default(5),
        }),
        execute: async ({ query, limit }) => {
          const url = new URL("/wikipedia/search", "https://external-service.internal");
          url.searchParams.set("query", query);
          url.searchParams.set("limit", String(limit));
          return readServiceJson(
            await externalService.fetch(url),
            wikipediaSearchResponse,
            "Wikipedia search",
          );
        },
      },
      lookupPreviousJudgment: {
        description: "現在の判例に記録された原審事件番号から前審判決の公開メタデータを取得する。",
        inputSchema: z.object({}),
        execute: async () => {
          if (!source.originalCaseNumber) return { found: false, judgment: null };
          const url = new URL("/courts/hanrei/previous", "https://external-service.internal");
          url.searchParams.set("caseNumber", source.originalCaseNumber);
          return readServiceJson(
            await externalService.fetch(url),
            previousJudgmentResponse,
            "Previous judgment lookup",
          );
        },
      },
    },
    stopWhen: stepCountIs(6),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `${DEFAULT_PROMPT}\n\n裁判所メタデータ:\n${JSON.stringify(metadataForPrompt(source))}`,
          },
          { type: "file", data: pdf, mediaType: "application/pdf", filename: "judgment.pdf" },
        ],
      },
    ],
    maxRetries: 0,
  });
  return result.output;
}
