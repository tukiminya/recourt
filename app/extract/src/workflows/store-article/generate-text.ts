import { createGateway, generateText, Output } from "ai";
import { env } from "cloudflare:workers";

import {
  CaseArticleGeneration,
  type CaseArticleGeneration as CaseArticleGenerationData,
} from "@recourt/types";

export const DEFAULT_PROMPT =
  "このPDFを読み、判例解説記事として日本語で整理してください。各フィールドの説明に従い、PDFに記載がない内容は推測せず、該当する配列を空にしてください。";

type GenerateTextFromPdfInput = {
  pdf: ReadableStream<Uint8Array>;
  prompt: string;
};

export async function generateTextFromPdf({
  pdf,
  prompt,
}: GenerateTextFromPdfInput): Promise<CaseArticleGenerationData> {
  const pdfBytes = new Uint8Array(await new Response(pdf).arrayBuffer());

  const gateway = createGateway({
    apiKey: env.VERCEL_AI_GATEWAY_API_KEY,
  });

  const result = await generateText({
    model: gateway("openai/gpt-5.6-sol"),
    output: Output.object({
      schema: CaseArticleGeneration,
      name: "case_article_generation",
      description: "判例PDFから記事の意味的な構造を抽出した結果。",
    }),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "file",
            data: pdfBytes,
            mediaType: "application/pdf",
            filename: "article.pdf",
          },
        ],
      },
    ],
    maxRetries: 0,
  });

  return result.output;
}
