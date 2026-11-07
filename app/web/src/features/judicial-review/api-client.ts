import { hc } from "hono/client";
import type { AppType } from "@recourt/api/rpc";
import { reviewReasonSummary, type ReviewReflection } from "@recourt/types";
import { caseApiBaseUrl } from "../case-explorer/api-client";
import { z } from "zod";

const client = hc<AppType>(caseApiBaseUrl, { init: { credentials: "omit" } });

async function ensureSuccess(response: Pick<Response, "ok" | "json">) {
  if (response.ok) return;
  const body: unknown = await response.json().catch(() => null);
  const parsed = z.object({ error: z.object({ message: z.string() }) }).safeParse(body);
  throw new Error(
    parsed.success
      ? parsed.data.error.message
      : "共有データを取得できませんでした。もう一度お試しください。",
  );
}

export async function fetchReviewReasons(
  judgeId: string,
  caseId: string,
  version: string,
  signal?: AbortSignal,
) {
  const response = await client.api.judges[":judgeId"].reasons.$get(
    { param: { judgeId }, query: { caseId, version } },
    { init: { signal } },
  );
  await ensureSuccess(response);
  return reviewReasonSummary.parse(await response.json());
}

export async function shareReviewReasons(judgeId: string, input: ReviewReflection) {
  const response = await client.api.judges[":judgeId"].reasons.$post({
    param: { judgeId },
    json: input,
  });
  await ensureSuccess(response);
}
