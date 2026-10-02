import type { AppType } from "@recourt/api/rpc";
import type { ChatEvent } from "@recourt/api/chat-events";
import { hc, type InferRequestType, type InferResponseType } from "hono/client";

const apiBaseUrl = import.meta.env.DEV ? "http://localhost:8787" : "https://api.recourt-v1.tuki.dev";
const client = hc<AppType>(apiBaseUrl, {
  init: { credentials: "omit" },
});

type ImportEndpoint = typeof client.api["reading-sources"]["$post"];
type ChatEndpoint = typeof client.api.chat["$post"];

export type ReadingSource = InferResponseType<ImportEndpoint, 201>;
export type ConversationMessage = InferRequestType<ChatEndpoint>["json"]["messages"][number];

export class ReadingRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function errorFromResponse(response: { json: () => Promise<unknown>; status: number }): Promise<ReadingRequestError> {
  const body: unknown = await response.json().catch(() => null);
  const message = typeof body === "object" && body !== null && "error" in body
    && typeof body.error === "object" && body.error !== null && "message" in body.error
    && typeof body.error.message === "string"
    ? body.error.message
    : "通信に失敗しました。もう一度お試しください。";
  return new ReadingRequestError(message, response.status);
}

export async function importReadingSource(url: string): Promise<ReadingSource> {
  const response = await client.api["reading-sources"].$post({ json: { url } });
  if (!response.ok) throw await errorFromResponse(response);
  return await response.json();
}

export async function deleteReadingSource(sourceId: string): Promise<void> {
  const response = await client.api["reading-sources"][":sourceId"].$delete({ param: { sourceId } });
  if (!response.ok) throw await errorFromResponse(response);
}

function parseEvent(name: string, rawData: string): ChatEvent {
  let data: unknown;
  try {
    data = JSON.parse(rawData);
  } catch {
    throw new ReadingRequestError("返答の形式を読み取れませんでした。", 502);
  }
  if (typeof data !== "object" || data === null) {
    throw new ReadingRequestError("返答の形式を読み取れませんでした。", 502);
  }
  if (name === "delta" && "text" in data && typeof data.text === "string") {
    return { event: "delta", data: { text: data.text } };
  }
  if (name === "done") return { event: "done", data: {} };
  if (name === "error" && "message" in data && typeof data.message === "string") {
    return { event: "error", data: { message: data.message } };
  }
  throw new ReadingRequestError("返答の形式を読み取れませんでした。", 502);
}

export async function streamChat(
  sourceId: string,
  messages: ConversationMessage[],
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const response = await client.api.chat.$post({ json: { sourceId, messages } }, { init: { signal } });
  if (!response.ok) throw await errorFromResponse(response);
  if (!response.body) throw new ReadingRequestError("返答を受信できませんでした。", 502);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";
  let finished = false;

  function consumeEvent(raw: string) {
    const lines = raw.split("\n");
    const name = lines.find((line) => line.startsWith("event: "))?.slice(7);
    const data = lines.find((line) => line.startsWith("data: "))?.slice(6);
    if (!name || !data) return;
    const value = parseEvent(name, data);
    if (value.event === "delta") {
      answer += value.data.text;
      onDelta(answer);
    } else if (value.event === "error") {
      throw new ReadingRequestError(value.data.message, 502);
    } else {
      finished = true;
    }
  }

  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        consumeEvent(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf("\n\n");
      }
      if (done) break;
    }
    if (!finished || !answer.trim()) {
      throw new ReadingRequestError("返答が途中で止まりました。もう一度お試しください。", 502);
    }
    return answer;
  } finally {
    if (!finished) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
