import { sValidator } from "@hono/standard-validator";
import {
  chizaiQuery,
  crawlerQueueMessage,
  generalQuery,
  gyoseiQuery,
  kakyusaiQuery,
  kosaiQuery,
  rodoQuery,
  saikosaiQuery,
  type CourtSearchCategory,
} from "@recourt/types/courts";
import { Hono } from "hono";
import { z } from "zod";

export { CrawlCaseWorkflow } from "./workflows/crawl-case";
export { CrawlSearchWorkflow, type CrawlSearchParams } from "./workflows/crawl-search";
import type { CrawlSearchParams } from "./workflows/crawl-search";

type AppEnv = { Bindings: Env };
const app = new Hono<AppEnv>();
const errorBody = (code: string, message: string) => ({ error: { code, message } });
const validationHook = (
  result: { success: boolean },
  context: { json: (body: ReturnType<typeof errorBody>, status: 400) => Response },
) =>
  !result.success
    ? context.json(errorBody("VALIDATION_ERROR", "Request validation failed"), 400)
    : undefined;

const rejectOffset = <T extends z.ZodType<Record<string, unknown>>>(schema: T) =>
  schema.refine((query) => query.offset === undefined, {
    message: "offset is managed by the crawler",
  });
const crawlIdParams = z.object({ crawlId: z.string().uuid() });

async function startCrawl(
  env: Env,
  category: CourtSearchCategory,
  query: Record<string, string | string[] | undefined>,
) {
  const crawlRunId = crypto.randomUUID();
  const params: CrawlSearchParams = { crawlRunId, category, query };
  await env.CRAWL_SEARCH.create({ id: crawlRunId, params });
  return { crawlId: crawlRunId, status: "queued" as const };
}

app.post(
  "/crawl/general",
  sValidator("query", rejectOffset(generalQuery), validationHook),
  async (c) => c.json(await startCrawl(c.env, "general", c.req.valid("query")), 202),
);
app.post(
  "/crawl/saikosai",
  sValidator("query", rejectOffset(saikosaiQuery), validationHook),
  async (c) => c.json(await startCrawl(c.env, "saikosai", c.req.valid("query")), 202),
);
app.post("/crawl/kosai", sValidator("query", rejectOffset(kosaiQuery), validationHook), async (c) =>
  c.json(await startCrawl(c.env, "kosai", c.req.valid("query")), 202),
);
app.post(
  "/crawl/kakyusai",
  sValidator("query", rejectOffset(kakyusaiQuery), validationHook),
  async (c) => c.json(await startCrawl(c.env, "kakyusai", c.req.valid("query")), 202),
);
app.post(
  "/crawl/gyosei",
  sValidator("query", rejectOffset(gyoseiQuery), validationHook),
  async (c) => c.json(await startCrawl(c.env, "gyosei", c.req.valid("query")), 202),
);
app.post("/crawl/rodo", sValidator("query", rejectOffset(rodoQuery), validationHook), async (c) =>
  c.json(await startCrawl(c.env, "rodo", c.req.valid("query")), 202),
);
app.post(
  "/crawl/chizai",
  sValidator("query", rejectOffset(chizaiQuery), validationHook),
  async (c) => c.json(await startCrawl(c.env, "chizai", c.req.valid("query")), 202),
);

app.get("/crawl/jobs/:crawlId", sValidator("param", crawlIdParams, validationHook), async (c) => {
  const instance = await c.env.CRAWL_SEARCH.get(c.req.valid("param").crawlId);
  return c.json(await instance.status());
});

app.notFound((c) => c.json(errorBody("NOT_FOUND", "Route not found"), 404));
app.onError((error, c) => {
  console.error(JSON.stringify({ message: "Crawler request failed", error: error.message }));
  return c.json(errorBody("INTERNAL_SERVER_ERROR", "Internal server error"), 500);
});

async function createCaseWorkflow(env: Env, message: Message<unknown>) {
  const payload = crawlerQueueMessage.parse(message.body);
  try {
    await env.CRAWL_CASE.create({ id: payload.jobId, params: payload });
  } catch (error) {
    const instance = await env.CRAWL_CASE.get(payload.jobId);
    const status = await instance.status();
    if (status.status === "unknown") throw error;
    if (status.status === "errored" || status.status === "terminated") {
      await instance.restart();
    }
  }
  message.ack();
  console.log(
    JSON.stringify({
      message: "Crawl workflow accepted",
      jobId: payload.jobId,
      courtDetailId: payload.courtDetailId,
    }),
  );
}

export default {
  fetch: app.fetch,
  async queue(batch, env) {
    for (const message of batch.messages) await createCaseWorkflow(env, message);
  },
} satisfies ExportedHandler<Env, unknown>;
