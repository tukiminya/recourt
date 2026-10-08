import { caseExtractionQueueMessage } from "@recourt/types";
import { Hono } from "hono";

export { ExtractCaseWorkflow } from "./workflows/extract-case";
export { StoreArticleWorkflow } from "./workflows/store-article";
export { PrepareCaseReadingWorkflow } from "./workflows/prepare-case-reading";

type AppEnv = { Bindings: Env };
const app = new Hono<AppEnv>();

app.get("/extract/jobs/:jobId", async (context) => {
  const jobId = context.req.param("jobId");
  if (jobId.length === 0 || jobId.length > 100) {
    return context.json({ error: { code: "VALIDATION_ERROR", message: "Invalid job ID" } }, 400);
  }
  const instance = await context.env.EXTRACT_CASE.get(jobId);
  return context.json(await instance.status());
});
app.get("/reading/jobs/:jobId", async (c) => {
  const jobId = c.req.param("jobId");
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(jobId))
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid job ID" } }, 400);
  return c.json(await (await c.env.PREPARE_CASE_READING.get(jobId)).status());
});

app.notFound((context) =>
  context.json({ error: { code: "NOT_FOUND", message: "Route not found" } }, 404),
);

async function createExtractWorkflow(env: Env, message: Message<unknown>) {
  const payload = caseExtractionQueueMessage.parse(message.body);
  const workflow = payload.version === 2 ? env.PREPARE_CASE_READING : env.EXTRACT_CASE;
  try {
    if (payload.version === 2)
      await env.PREPARE_CASE_READING.create({ id: payload.jobId, params: payload });
    else await env.EXTRACT_CASE.create({ id: payload.jobId, params: payload });
  } catch (error) {
    const instance = await workflow.get(payload.jobId);
    const status = await instance.status();
    if (status.status === "unknown") throw error;
    if (status.status === "errored" || status.status === "terminated") {
      await instance.restart();
    }
  }
  message.ack();
  console.log(
    JSON.stringify({
      message: "Extract workflow accepted",
      jobId: payload.jobId,
      courtCaseId: payload.courtCaseId,
    }),
  );
}

export default {
  fetch: app.fetch,
  async queue(batch, env) {
    for (const message of batch.messages) await createExtractWorkflow(env, message);
  },
} satisfies ExportedHandler<Env, unknown>;
