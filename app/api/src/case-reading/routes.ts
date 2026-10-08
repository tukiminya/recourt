import { Hono } from "hono";
import { sValidator } from "@hono/standard-validator";
import {
  caseChatBody,
  caseExplainBody,
  caseDocument,
  readingCase,
  readingTopic,
  caseListResult,
} from "@recourt/types";
import { z } from "zod";
import { streamCaseReading } from "./chat";

const params = z.object({ caseId: z.uuid() });
const documentParams = params.extend({ documentId: z.uuid() });
const query = z.object({
  topics: z.string().max(600).default(""),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
});
const validation = (
  result: { success: boolean },
  c: { json: (body: object, status: 400) => Response },
) =>
  !result.success
    ? c.json({ error: { code: "VALIDATION_ERROR", message: "入力内容を確認してください。" } }, 400)
    : undefined;
class CaseServiceError extends Error {
  constructor(
    readonly status: 404 | 502,
    message: string,
  ) {
    super(message);
  }
}

async function internal(env: Env, path: string, headers?: Headers) {
  const response = await env.INTERNAL_SERVICE.fetch(
    `https://internal-service.internal/reading/${path}`,
    { headers, signal: AbortSignal.timeout(30_000) },
  );
  if (response.status === 416 && path.endsWith("/pdf")) return response;
  if (!response.ok) {
    await response.body?.cancel();
    throw new CaseServiceError(
      response.status === 404 ? 404 : 502,
      response.status === 404
        ? "この裁判の読解資料が見つかりませんでした。"
        : "判例データを取得できませんでした。もう一度お試しください。",
    );
  }
  return response;
}

export const caseReadingRoutes = new Hono<{ Bindings: Env }>()
  .get("/topics", async (c) => {
    const body = z
      .object({ topics: readingTopic.array() })
      .parse(await (await internal(c.env, "topics")).json());
    return c.json(body);
  })
  .get("/cases", sValidator("query", query, validation), async (c) => {
    const { topics, offset } = c.req.valid("query");
    const values = new URLSearchParams({ topics, offset: String(offset) });
    return c.json(caseListResult.parse(await (await internal(c.env, `cases?${values}`)).json()));
  })
  .get("/cases/:caseId", sValidator("param", params, validation), async (c) =>
    c.json(
      readingCase.parse(
        await (await internal(c.env, `cases/${c.req.valid("param").caseId}`)).json(),
      ),
    ),
  )
  .get(
    "/cases/:caseId/documents/:documentId/pdf",
    sValidator("param", documentParams, validation),
    async (c) => {
      const { caseId, documentId } = c.req.valid("param");
      const headers = new Headers();
      const range = c.req.header("Range");
      if (range) headers.set("Range", range);
      return internal(c.env, `cases/${caseId}/documents/${documentId}/pdf`, headers);
    },
  )
  .post(
    "/cases/:caseId/explain",
    sValidator("param", params, validation),
    sValidator("json", caseExplainBody, validation),
    async (c) => {
      const { success } = await c.env.CHAT_LIMIT.limit({
        key: c.req.header("cf-connecting-ip") ?? "local",
      });
      if (!success) {
        c.header("Retry-After", "60");
        return c.json(
          { error: { code: "RATE_LIMITED", message: "少し待ってからお試しください。" } },
          429,
        );
      }
      const { caseId } = c.req.valid("param");
      const input = c.req.valid("json");
      const document = caseDocument.parse(
        await (await internal(c.env, `cases/${caseId}/documents/${input.documentId}`)).json(),
      );
      return streamCaseReading({
        apiKey: c.env.VERCEL_AI_GATEWAY_API_KEY,
        courtCase: document.case,
        text: document.text,
        ...input,
        signal: c.req.raw.signal,
      });
    },
  )
  .post(
    "/cases/:caseId/chat",
    sValidator("param", params, validation),
    sValidator("json", caseChatBody, validation),
    async (c) => {
      const { success } = await c.env.CHAT_LIMIT.limit({
        key: c.req.header("cf-connecting-ip") ?? "local",
      });
      if (!success) {
        c.header("Retry-After", "60");
        return c.json(
          { error: { code: "RATE_LIMITED", message: "少し待ってからお試しください。" } },
          429,
        );
      }
      const { caseId } = c.req.valid("param");
      const input = c.req.valid("json");
      const document = caseDocument.parse(
        await (await internal(c.env, `cases/${caseId}/documents/${input.documentId}`)).json(),
      );
      return streamCaseReading({
        apiKey: c.env.VERCEL_AI_GATEWAY_API_KEY,
        courtCase: document.case,
        text: document.text,
        ...input,
        signal: c.req.raw.signal,
      });
    },
  );

caseReadingRoutes.onError((error, c) => {
  console.error(
    JSON.stringify({ event: "case_request_failed", name: error.name, path: c.req.path }),
  );
  return c.json(
    {
      error: {
        code:
          error instanceof CaseServiceError && error.status === 404
            ? "NOT_FOUND"
            : "CASE_UNAVAILABLE",
        message:
          error instanceof CaseServiceError
            ? error.message
            : "判例の読解に失敗しました。もう一度お試しください。",
      },
    },
    error instanceof CaseServiceError ? error.status : 502,
  );
});
