import type { LatestCaseArticleStorage } from "@recourt/types";
import { generateArticleObjectKey, type GenerateArticleObjectKeyProps } from "@recourt/utils";
import { InternalServerError } from "@recourt/utils/error";
import { env } from "cloudflare:workers";
import type z from "zod";

export async function putArticleWithId(
  article: z.infer<typeof LatestCaseArticleStorage>,
  props: GenerateArticleObjectKeyProps,
) {
  try {
    await env.R2.put(generateArticleObjectKey(props), JSON.stringify(article));
  } catch {
    throw InternalServerError;
  }
}
