import { Hono } from "hono";
import { sValidator } from "@hono/standard-validator";
import { heldJudgmentSource, preparedJudgment, caseCourtId } from "@recourt/types";
import { z } from "zod";
import { createCaseReadingService } from "./service/case-reading";

const params = z.object({ caseId: z.uuid() });
const documentParams = params.extend({ documentId: z.uuid() });
const validation = (
  result: { success: boolean },
  c: { json: (body: object, status: 400) => Response },
) =>
  !result.success
    ? c.json({ error: { code: "VALIDATION_ERROR", message: "入力内容を確認してください。" } }, 400)
    : undefined;
const service = (env: Env) => createCaseReadingService(env.DB_URL, env.CASE_DOCUMENTS);

export const caseReadingRoutes = new Hono<{ Bindings: Env }>()
  .post(
    "/documents/claim",
    sValidator(
      "json",
      z.object({
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
        version: z.number().int().positive(),
        owner: z.string().min(1).max(100),
      }),
      validation,
    ),
    async (c) => {
      const { sha256, version, owner } = c.req.valid("json");
      return c.json(await service(c.env).claimClassification(sha256, version, owner));
    },
  )
  .post("/documents/hold", sValidator("json", heldJudgmentSource, validation), async (c) =>
    c.json(await service(c.env).holdSource(c.req.valid("json")), 201),
  )
  .post("/documents", sValidator("json", preparedJudgment, validation), async (c) =>
    c.json(await service(c.env).register(c.req.valid("json")), 201),
  )
  .post(
    "/documents/find",
    sValidator(
      "json",
      z.object({
        courtCaseId: caseCourtId,
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
        version: z.number().int().positive(),
      }),
      validation,
    ),
    async (c) => {
      const input = c.req.valid("json");
      return c.json(
        await service(c.env).findPrepared(input.courtCaseId, input.sha256, input.version),
      );
    },
  )
  .get("/topics", async (c) => c.json(await service(c.env).topics()))
  .get(
    "/cases",
    sValidator(
      "query",
      z.object({
        topics: z.string().max(600).default(""),
        offset: z.coerce.number().int().min(0).max(100_000).default(0),
      }),
      validation,
    ),
    async (c) => {
      const { topics, offset } = c.req.valid("query");
      return c.json(
        await service(c.env).list([...new Set(topics.split(",").filter(Boolean))], offset),
      );
    },
  )
  .get("/cases/:caseId", sValidator("param", params, validation), async (c) =>
    c.json(await service(c.env).getCase(c.req.valid("param").caseId)),
  )
  .get(
    "/cases/:caseId/documents/:documentId",
    sValidator("param", documentParams, validation),
    async (c) => {
      const { caseId, documentId } = c.req.valid("param");
      return c.json(await service(c.env).getDocument(caseId, documentId));
    },
  )
  .get(
    "/cases/:caseId/documents/:documentId/pdf",
    sValidator("param", documentParams, validation),
    async (c) => {
      const { caseId, documentId } = c.req.valid("param");
      return service(c.env).pdf(caseId, documentId, c.req.raw.headers);
    },
  );
