import { CaseArticleStorage } from "@recourt/types";
import { generateArticleObjectKey, type GenerateArticleObjectKeyProps } from "@recourt/utils";
import { ConflictError, InternalServerError } from "@recourt/utils/error";
import type { z } from "zod";

export type StoredArticle = {
  article: z.infer<typeof CaseArticleStorage>;
  serialized: string;
  sha256: string;
};

export type ArticleStore = {
  putDraft: (
    location: GenerateArticleObjectKeyProps,
    serialized: string,
    sha256: string,
  ) => Promise<void>;
  getDraft: (location: GenerateArticleObjectKeyProps) => Promise<StoredArticle | undefined>;
  getPublished: (location: GenerateArticleObjectKeyProps) => Promise<StoredArticle | undefined>;
  publishDraft: (location: GenerateArticleObjectKeyProps, sha256: string) => Promise<void>;
  deleteDraft: (location: GenerateArticleObjectKeyProps) => Promise<void>;
};

export type ArticleBucket = {
  get: (key: string) => Promise<{ text: () => Promise<string> } | null>;
  head: (key: string) => Promise<{ customMetadata?: Record<string, string> } | null>;
  put: (key: string, value: string, options: R2PutOptions) => Promise<object | null>;
  delete: (key: string) => Promise<void>;
};

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function asInternalStorageError(message: string, error: unknown): never {
  if (error instanceof ConflictError || error instanceof InternalServerError) {
    throw error;
  }

  throw new InternalServerError(message, { cause: error });
}

async function readArticle(
  bucket: ArticleBucket,
  location: GenerateArticleObjectKeyProps,
): Promise<StoredArticle | undefined> {
  const object = await bucket.get(generateArticleObjectKey(location));
  if (object === null) {
    return undefined;
  }

  const serialized = await object.text();
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(serialized);
  } catch (error) {
    throw new InternalServerError("Stored article is not valid JSON", { cause: error });
  }

  const parsedArticle = CaseArticleStorage.safeParse(parsedJson);
  if (!parsedArticle.success) {
    throw new InternalServerError("Stored article does not match a supported schema", {
      cause: parsedArticle.error,
    });
  }

  return {
    article: parsedArticle.data,
    serialized,
    sha256: await sha256Hex(serialized),
  };
}

async function assertPublishedHash(
  bucket: ArticleBucket,
  location: GenerateArticleObjectKeyProps,
  expectedSha256: string,
) {
  const key = generateArticleObjectKey(location);
  const [object, stored] = await Promise.all([bucket.head(key), readArticle(bucket, location)]);
  if (object === null || stored === undefined) {
    throw new InternalServerError("Published article was not stored");
  }

  if (object.customMetadata?.sha256 !== expectedSha256 || stored.sha256 !== expectedSha256) {
    throw new ConflictError(
      "Published article content does not match the revision",
      "ARTICLE_CONTENT_CONFLICT",
    );
  }
}

export function createArticleStore(drafts: ArticleBucket, published: ArticleBucket): ArticleStore {
  return {
    async putDraft(location, serialized, sha256) {
      try {
        const stored = await drafts.put(generateArticleObjectKey(location), serialized, {
          onlyIf: { etagDoesNotMatch: "*" },
          httpMetadata: { contentType: "application/json; charset=utf-8" },
          customMetadata: { sha256 },
          sha256,
        });

        if (stored === null) {
          throw new ConflictError("Draft article already exists", "ARTICLE_ALREADY_EXISTS");
        }
      } catch (error) {
        return asInternalStorageError("Failed to store draft article", error);
      }
    },

    async getDraft(location) {
      try {
        return await readArticle(drafts, location);
      } catch (error) {
        return asInternalStorageError("Failed to read draft article", error);
      }
    },

    async getPublished(location) {
      try {
        return await readArticle(published, location);
      } catch (error) {
        return asInternalStorageError("Failed to read published article", error);
      }
    },

    async publishDraft(location, sha256) {
      const key = generateArticleObjectKey(location);

      try {
        const existing = await published.head(key);
        if (existing !== null) {
          await assertPublishedHash(published, location, sha256);
          return;
        }

        const draft = await readArticle(drafts, location);
        if (draft === undefined) {
          throw new InternalServerError("Draft article is missing during publication");
        }
        if (draft.sha256 !== sha256) {
          throw new ConflictError(
            "Draft article content does not match the revision",
            "ARTICLE_CONTENT_CONFLICT",
          );
        }

        await published.put(key, draft.serialized, {
          onlyIf: { etagDoesNotMatch: "*" },
          httpMetadata: { contentType: "application/json; charset=utf-8" },
          customMetadata: { sha256 },
          sha256,
        });

        await assertPublishedHash(published, location, sha256);
      } catch (error) {
        return asInternalStorageError("Failed to publish article", error);
      }
    },

    async deleteDraft(location) {
      try {
        await drafts.delete(generateArticleObjectKey(location));
      } catch (error) {
        return asInternalStorageError("Failed to delete draft article", error);
      }
    },
  };
}
