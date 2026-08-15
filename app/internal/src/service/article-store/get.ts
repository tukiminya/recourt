import type { caseArticleSchemas } from "@recourt/types";
import { generateArticleObjectKey, type GenerateArticleObjectKeyProps } from "@recourt/utils";
import { InternalServerError, NotFoundError } from "@recourt/utils/error";
import { env } from "cloudflare:workers";
import type z from "zod";

export async function getArticleWithId(props: GenerateArticleObjectKeyProps) {
  try {
    const result = await env.R2.get(generateArticleObjectKey(props));
    if (!result) throw NotFoundError;
    return result.json<z.infer<typeof caseArticleSchemas>>();
  } catch {
    throw InternalServerError;
  }
}
