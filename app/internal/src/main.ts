import { sValidator } from "@hono/standard-validator";
import { createRevisionBody, uuidv7 } from "@recourt/types";
import { ConflictError, InternalServerError, NotFoundError } from "@recourt/utils/error";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { createArticleStore } from "./service/article-store/article-store";
import { createCasesService } from "./service/cases";

type AppEnv = { Bindings: Env };

const caseParams = z.object({ caseId: uuidv7 });
const revisionParams = z.object({ caseId: uuidv7, revisionId: uuidv7 });
const listQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const errorBody = (code: string, message: string) => ({ error: { code, message } });

const validationHook = (
  result: { success: boolean },
  context: { json: (body: ReturnType<typeof errorBody>, status: 400) => Response },
) => {
  if (!result.success) {
    return context.json(errorBody("VALIDATION_ERROR", "Request validation failed"), 400);
  }
};

const casesService = (env: Env) =>
  createCasesService(env.DB_URL, createArticleStore(env.DRAFT_ARTICLES, env.PUBLISHED_ARTICLES));

const app = new Hono<AppEnv>();

app.use(
  "*",
  bodyLimit({
    maxSize: 5 * 1024 * 1024,
    onError: (context) =>
      context.json(errorBody("PAYLOAD_TOO_LARGE", "Request body is too large"), 413),
  }),
);

app.post("/case", sValidator("json", createRevisionBody, validationHook), async (context) => {
  const result = await casesService(context.env).createCase(context.req.valid("json"));
  return context.json(result, 201);
});

app.get(
  "/case/:caseId",
  sValidator("param", caseParams, validationHook),
  sValidator("query", listQuery, validationHook),
  async (context) => {
    const { caseId } = context.req.valid("param");
    return context.json(
      await casesService(context.env).listRevisions(caseId, context.req.valid("query")),
    );
  },
);

app.post(
  "/case/:caseId/revision",
  sValidator("param", caseParams, validationHook),
  sValidator("json", createRevisionBody, validationHook),
  async (context) => {
    const { caseId } = context.req.valid("param");
    const result = await casesService(context.env).createRevision(
      caseId,
      context.req.valid("json"),
    );
    return context.json(result, 201);
  },
);

app.get(
  "/case/:caseId/revision/:revisionId",
  sValidator("param", revisionParams, validationHook),
  async (context) => {
    const { caseId, revisionId } = context.req.valid("param");
    return context.json(await casesService(context.env).getArticle(caseId, revisionId));
  },
);

app.delete(
  "/case/:caseId/revision/:revisionId",
  sValidator("param", revisionParams, validationHook),
  async (context) => {
    const { caseId, revisionId } = context.req.valid("param");
    await casesService(context.env).deleteRevision(caseId, revisionId);
    return context.body(null, 204);
  },
);

app.post(
  "/case/:caseId/revision/:revisionId/publish",
  sValidator("param", revisionParams, validationHook),
  async (context) => {
    const { caseId, revisionId } = context.req.valid("param");
    return context.json(await casesService(context.env).publishRevision(caseId, revisionId));
  },
);

app.notFound((context) => context.json(errorBody("NOT_FOUND", "Route not found"), 404));

app.onError((error, context) => {
  if (error instanceof NotFoundError) {
    return context.json(errorBody("NOT_FOUND", error.message), 404);
  }
  if (error instanceof ConflictError) {
    return context.json(errorBody(error.code, error.message), 409);
  }
  if (error instanceof HTTPException && error.status < 500) {
    const code = error.status === 400 ? "VALIDATION_ERROR" : "HTTP_ERROR";
    const message = error.status === 400 ? "Request validation failed" : error.message;
    return context.json(errorBody(code, message), error.status);
  }

  const internalError =
    error instanceof InternalServerError
      ? error
      : new InternalServerError("Unhandled error", undefined, { cause: error });
  console.error(
    JSON.stringify({
      message: "Internal request failed",
      method: context.req.method,
      path: context.req.path,
      error: { name: internalError.name, message: internalError.message },
    }),
  );
  return context.json(errorBody("INTERNAL_SERVER_ERROR", "Internal server error"), 500);
});

export default app;
