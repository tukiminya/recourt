import { sValidator } from "@hono/standard-validator";
import { Hono } from "hono";
import { reviewReflectionBody } from "@recourt/types";
import { z } from "zod";
import { getJudgeCases, getReviewJudge, getReviewCatalog } from "./catalog";
import { createReviewReflectionStore, type ReviewReflectionStore } from "./reflection-store";

const params = z.object({ judgeId: z.string().regex(/^[a-z0-9-]{1,80}$/) });
const summaryQuery = z.object({
  caseId: z.string().regex(/^[a-z0-9-]{1,80}$/),
  version: z.string().max(80),
});
const error = (code: string, message: string) => ({ error: { code, message } });
const validation = (
  result: { success: boolean },
  c: { json: (body: object, status: 400) => Response },
) =>
  !result.success
    ? c.json(error("VALIDATION_ERROR", "選んだ論点を確認してください。"), 400)
    : undefined;

function materialError(judgeId: string, caseId: string, version: string) {
  if (!getReviewCatalog(version))
    return {
      code: "EDITION_NOT_FOUND",
      message: "この版の資料は見つかりません。資料のリンクを確認してください。",
      status: 409 as const,
    };
  if (
    !getReviewJudge(judgeId, version) ||
    !getJudgeCases(judgeId, version).some((item) => item.id === caseId)
  )
    return {
      code: "NOT_FOUND",
      message: "この裁判官の資料が見つかりません。",
      status: 404 as const,
    };
}

export function createJudicialReviewRoutes(
  createStore: (url: string) => ReviewReflectionStore = createReviewReflectionStore,
) {
  return new Hono<{ Bindings: Pick<Env, "DB_URL" | "CHAT_LIMIT"> }>()
    .get(
      "/judges/:judgeId/reasons",
      sValidator("param", params, validation),
      sValidator("query", summaryQuery, validation),
      async (c) => {
        const { judgeId } = c.req.valid("param");
        const { caseId, version } = c.req.valid("query");
        const missing = materialError(judgeId, caseId, version);
        if (missing) return c.json(error(missing.code, missing.message), missing.status);
        c.header("Cache-Control", "no-store");
        if (!c.env.DB_URL)
          return c.json(
            error("UNAVAILABLE", "論点の共有は準備中です。資料はそのまま読めます。"),
            503,
          );
        return c.json(await createStore(c.env.DB_URL).summarize(judgeId, caseId, version));
      },
    )
    .post(
      "/judges/:judgeId/reasons",
      sValidator("param", params, validation),
      sValidator("json", reviewReflectionBody, validation),
      async (c) => {
        const { judgeId } = c.req.valid("param");
        const input = c.req.valid("json");
        const missing = materialError(judgeId, input.caseId, input.catalogVersion);
        if (missing) return c.json(error(missing.code, missing.message), missing.status);
        const { success } = await c.env.CHAT_LIMIT.limit({
          key: `review-reasons:${c.req.header("cf-connecting-ip") ?? "local"}`,
        });
        if (!success) {
          c.header("Retry-After", "60");
          return c.json(
            error("RATE_LIMITED", "送信が続いています。少し待ってからお試しください。"),
            429,
          );
        }
        c.header("Cache-Control", "no-store");
        if (!c.env.DB_URL)
          return c.json(
            error("UNAVAILABLE", "論点の共有は準備中です。資料はそのまま読めます。"),
            503,
          );
        const result = await createStore(c.env.DB_URL).submit(judgeId, input);
        if (result === "conflict")
          return c.json(
            error(
              "REQUEST_CONFLICT",
              "送信済みの内容と一致しません。ページを再読み込みしてください。",
            ),
            409,
          );
        return c.json({ saved: true }, result === "created" ? 201 : 200);
      },
    );
}

export const judicialReviewRoutes = createJudicialReviewRoutes();
