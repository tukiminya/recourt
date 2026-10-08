import { hc } from "hono/client";
import type { AppType } from "@recourt/api/rpc";
import {
  caseReadingEvent,
  type ReadingCase,
  type ReadingParagraph,
  type caseExplainBody,
  type caseChatBody,
} from "@recourt/types";
import type { z } from "zod";
import { ReadingRequestError } from "../guided-reading/api-client";

export const caseApiBaseUrl =
  import.meta.env.VITE_CASE_API_URL ??
  (import.meta.env.DEV ? "http://localhost:8787" : "https://api.recourt-v1.tuki.dev");
const client = hc<AppType>(caseApiBaseUrl, { init: { credentials: "omit" } });

async function ensureSuccess(response: Pick<Response, "ok" | "json" | "status">) {
  if (response.ok) return;
  const body: unknown = await response.json().catch(() => null);
  const message =
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "object" &&
    body.error !== null &&
    "message" in body.error &&
    typeof body.error.message === "string"
      ? body.error.message
      : "通信に失敗しました。もう一度お試しください。";
  throw new ReadingRequestError(message, response.status);
}

export async function fetchTopics(signal?: AbortSignal) {
  const response = await client.api.topics.$get({}, { init: { signal } });
  await ensureSuccess(response);
  return (await response.json()).topics;
}
export async function fetchCases(topics: string[], offset = 0, signal?: AbortSignal) {
  const response = await client.api.cases.$get(
    { query: { topics: topics.join(","), offset: String(offset) } },
    { init: { signal } },
  );
  await ensureSuccess(response);
  return response.json();
}
export async function fetchCase(caseId: string): Promise<ReadingCase> {
  const response = await client.api.cases[":caseId"].$get({ param: { caseId } });
  await ensureSuccess(response);
  return response.json();
}

export async function consumeCaseStream(
  response: Pick<Response, "ok" | "json" | "status" | "body">,
  onParagraph: (paragraph: ReadingParagraph) => void,
): Promise<ReadingParagraph[]> {
  await ensureSuccess(response);
  if (!response.body) throw new ReadingRequestError("返答を受信できませんでした。", 502);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const paragraphs: ReadingParagraph[] = [];
  let buffer = "";
  let finished = false;
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      if (buffer.length > 100_000) throw new ReadingRequestError("返答が長すぎます。", 502);
      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        const raw = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const name = raw
          .split("\n")
          .find((line) => line.startsWith("event: "))
          ?.slice(7);
        const data = raw
          .split("\n")
          .find((line) => line.startsWith("data: "))
          ?.slice(6);
        if (name && data) {
          let value: unknown;
          try {
            value = JSON.parse(data);
          } catch {
            throw new ReadingRequestError("返答の形式を読み取れませんでした。", 502);
          }
          const parsed = caseReadingEvent.safeParse({ event: name, data: value });
          if (!parsed.success)
            throw new ReadingRequestError("返答の形式を読み取れませんでした。", 502);
          if (parsed.data.event === "error")
            throw new ReadingRequestError(parsed.data.data.message, 502);
          if (parsed.data.event === "done") finished = true;
          if (parsed.data.event === "paragraph") {
            paragraphs.push(parsed.data.data);
            onParagraph(parsed.data.data);
          }
        }
        boundary = buffer.indexOf("\n\n");
      }
      if (done) break;
    }
    if (!finished || paragraphs.length === 0)
      throw new ReadingRequestError("返答が途中で止まりました。もう一度お試しください。", 502);
    return paragraphs;
  } finally {
    if (!finished) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export async function explainCase(
  courtCase: ReadingCase,
  input: z.infer<typeof caseExplainBody>,
  onParagraph: (paragraph: ReadingParagraph) => void,
  signal: AbortSignal,
) {
  return consumeCaseStream(
    await client.api.cases[":caseId"].explain.$post(
      { param: { caseId: courtCase.id }, json: input },
      { init: { signal } },
    ),
    onParagraph,
  );
}
export async function chatAboutCase(
  courtCase: ReadingCase,
  input: z.infer<typeof caseChatBody>,
  onParagraph: (paragraph: ReadingParagraph) => void,
  signal: AbortSignal,
) {
  return consumeCaseStream(
    await client.api.cases[":caseId"].chat.$post(
      { param: { caseId: courtCase.id }, json: input },
      { init: { signal } },
    ),
    onParagraph,
  );
}
