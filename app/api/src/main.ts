/// <reference path="../worker-configuration.d.ts" />
import { sValidator } from "@hono/standard-validator";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { z } from "zod";

import { ArticleUnavailableError, extractArticle } from "./reading/article-browser";
import { streamConversation } from "./reading/chat";
import { createReadingSourceStore } from "./reading/source-store";
import { InvalidSourceUrlError } from "./reading/source-url";
import { caseReadingRoutes } from "./case-reading/routes";

type AppEnv = { Bindings: Env };

const importBody = z.strictObject({ url: z.string().trim().min(1).max(2_048) });
const sourceParams = z.strictObject({ sourceId: z.uuid() });
const chatBody = z.strictObject({
  sourceId: z.uuid(),
  messages: z.array(z.strictObject({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(4_000),
  })).min(1).max(20),
}).refine(
  ({ messages }) => messages.every((message, index) => message.role === (index % 2 === 0 ? "user" : "assistant")) && messages.at(-1)?.role === "user",
  { message: "Conversation messages must alternate and end with the reader" },
);

const errorBody = (code: string, message: string) => ({ error: { code, message } });
const validationHook = (
  result: { success: boolean },
  context: { json: (body: ReturnType<typeof errorBody>, status: 400) => Response },
) => {
  if (!result.success) {
    return context.json(errorBody("VALIDATION_ERROR", "入力内容を確認してください。"), 400);
  }
};

const app = new Hono<AppEnv>();
app.use("/api/*", async (context, next) => {
  const origin = context.req.header("Origin");
  if (origin && origin !== context.env.WEB_ORIGIN) {
    return context.json(errorBody("FORBIDDEN", "このリクエストは受け付けられません。"), 403);
  }
  await next();
});
app.use("/api/*", cors({
  origin: (origin, context) => origin === context.env.WEB_ORIGIN ? origin : "",
  allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Range"],
  exposeHeaders: ["Content-Range", "Accept-Ranges"],
  maxAge: 600,
}));
app.use("*", bodyLimit({
  maxSize: 100 * 1_024,
  onError: (context) => context.json(errorBody("PAYLOAD_TOO_LARGE", "入力内容が長すぎます。"), 413),
}));

const routes = app.post("/api/reading-sources", sValidator("json", importBody, validationHook), async (context) => {
  const { success } = await context.env.IMPORT_LIMIT.limit({
    key: context.req.header("cf-connecting-ip") ?? "local",
  });
  if (!success) {
    context.header("Retry-After", "60");
    return context.json(errorBody("RATE_LIMITED", "記事の取得回数が多すぎます。少し待ってからお試しください。"), 429);
  }

  try {
    const article = await extractArticle(context.env.BROWSER, context.req.valid("json").url);
    const source = await createReadingSourceStore(context.env.DB_URL).create(article);
    context.header("Cache-Control", "no-store");
    return context.json({
      sourceId: source.id,
      title: source.title,
      url: source.source_url,
      excerpt: article.excerpt,
      expiresAt: source.expires_at.toISOString(),
    }, 201);
  } catch (error) {
    if (error instanceof InvalidSourceUrlError) {
      return context.json(errorBody("INVALID_URL", error.message), 400);
    }
    if (error instanceof ArticleUnavailableError) {
      if (error.status === 503) context.header("Retry-After", "60");
      return context.json(errorBody("ARTICLE_UNAVAILABLE", error.message), error.status as 422 | 502 | 503);
    }
    throw error;
  }
}).delete("/api/reading-sources/:sourceId", sValidator("param", sourceParams, validationHook), async (context) => {
  await createReadingSourceStore(context.env.DB_URL).delete(context.req.valid("param").sourceId);
  return context.body(null, 204);
}).post("/api/chat", sValidator("json", chatBody, validationHook), async (context) => {
  const { sourceId, messages } = context.req.valid("json");
  const { success } = await context.env.CHAT_LIMIT.limit({
    key: context.req.header("cf-connecting-ip") ?? "local",
  });
  if (!success) {
    context.header("Retry-After", "60");
    return context.json(errorBody("RATE_LIMITED", "会話の送信回数が多すぎます。少し待ってからお試しください。"), 429);
  }

  const store = createReadingSourceStore(context.env.DB_URL);
  const source = await store.get(sourceId);
  if (!source || source.expires_at.getTime() <= Date.now()) {
    if (source) await store.delete(sourceId);
    return context.json(errorBody("SOURCE_EXPIRED", "記事の利用時間が終わりました。URLから新しい会話を始めてください。"), 410);
  }

  return streamConversation({
    apiKey: context.env.VERCEL_AI_GATEWAY_API_KEY,
    source,
    messages,
  });
});

const allRoutes = routes.route("/api", caseReadingRoutes);
export type AppType = typeof allRoutes;

app.notFound((context) => context.json(errorBody("NOT_FOUND", "ページが見つかりません。"), 404));
app.onError((error, context) => {
  console.error(JSON.stringify({ event: "api_request_failed", path: context.req.path, name: error.name }));
  return context.json(errorBody("INTERNAL_SERVER_ERROR", "処理に失敗しました。もう一度お試しください。"), 500);
});

export default {
  fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  },
  async scheduled(_controller, env) {
    await createReadingSourceStore(env.DB_URL).purgeExpired();
  },
} satisfies ExportedHandler<Env>;
