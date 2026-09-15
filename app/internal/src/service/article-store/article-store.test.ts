import { ConflictError, InternalServerError } from "@recourt/utils/error";
import { describe, expect, it } from "vitest";

import { createArticleStore, sha256Hex, type ArticleBucket } from "./article-store";
import { caseId, createBody, revisionId } from "../../test/fixtures";

class MemoryBucket implements ArticleBucket {
  readonly objects = new Map<string, { value: string; customMetadata?: Record<string, string> }>();

  async get(key: string) {
    const object = this.objects.get(key);
    return object === undefined ? null : { text: async () => object.value };
  }

  async head(key: string) {
    const object = this.objects.get(key);
    return object === undefined ? null : { customMetadata: object.customMetadata };
  }

  async put(key: string, value: string, options: R2PutOptions) {
    if (
      options.onlyIf !== undefined &&
      !(options.onlyIf instanceof Headers) &&
      options.onlyIf.etagDoesNotMatch === "*" &&
      this.objects.has(key)
    ) {
      return null;
    }
    this.objects.set(key, { value, customMetadata: options.customMetadata });
    return {};
  }

  async delete(key: string) {
    this.objects.delete(key);
  }
}

const location = { caseId, revisionId };
const key = `article/${caseId}/revision/${revisionId}`;

describe("R2 article store", () => {
  it("keeps drafts private and conditionally copies them to published storage", async () => {
    const drafts = new MemoryBucket();
    const published = new MemoryBucket();
    const store = createArticleStore(drafts, published);
    const serialized = JSON.stringify(createBody.article);
    const hash = await sha256Hex(serialized);

    await store.putDraft(location, serialized, hash);
    expect(drafts.objects.has(key)).toBe(true);
    expect(published.objects.has(key)).toBe(false);

    await store.publishDraft(location, hash);
    expect(published.objects.get(key)?.value).toBe(serialized);
    expect(published.objects.get(key)?.customMetadata?.sha256).toBe(hash);

    await store.deleteDraft(location);
    expect(drafts.objects.has(key)).toBe(false);
    expect(published.objects.has(key)).toBe(true);
  });

  it("never overwrites an existing draft object", async () => {
    const drafts = new MemoryBucket();
    const store = createArticleStore(drafts, new MemoryBucket());
    const serialized = JSON.stringify(createBody.article);
    const hash = await sha256Hex(serialized);

    await store.putDraft(location, serialized, hash);
    await expect(store.putDraft(location, "different", hash)).rejects.toBeInstanceOf(ConflictError);
    expect(drafts.objects.get(key)?.value).toBe(serialized);
  });

  it("reads supported stored schemas and reports missing objects", async () => {
    const drafts = new MemoryBucket();
    const store = createArticleStore(drafts, new MemoryBucket());
    const serialized = JSON.stringify(createBody.article);
    const hash = await sha256Hex(serialized);

    await store.putDraft(location, serialized, hash);
    await expect(store.getDraft(location)).resolves.toMatchObject({
      article: createBody.article,
      sha256: hash,
    });
    await expect(store.getPublished(location)).resolves.toBeUndefined();
  });

  it.each([
    ["invalid JSON", "not-json"],
    ["an unsupported article", JSON.stringify({ schema_version: "unknown" })],
  ])("rejects %s in storage", async (_name, value) => {
    const drafts = new MemoryBucket();
    drafts.objects.set(key, { value });

    await expect(
      createArticleStore(drafts, new MemoryBucket()).getDraft(location),
    ).rejects.toBeInstanceOf(InternalServerError);
  });

  it("rejects draft and published content whose bytes do not match the DB hash", async () => {
    const serialized = JSON.stringify(createBody.article);
    const expectedHash = await sha256Hex(serialized);

    const drafts = new MemoryBucket();
    drafts.objects.set(key, { value: `${serialized} ` });
    await expect(
      createArticleStore(drafts, new MemoryBucket()).publishDraft(location, expectedHash),
    ).rejects.toBeInstanceOf(ConflictError);

    const published = new MemoryBucket();
    published.objects.set(key, {
      value: `${serialized} `,
      customMetadata: { sha256: expectedHash },
    });
    await expect(
      createArticleStore(new MemoryBucket(), published).publishDraft(location, expectedHash),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
