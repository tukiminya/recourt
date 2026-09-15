import type {
  CaseWithRevision,
  CreateRevisionBody,
  ListCaseRevisionsResult,
  RevisionMetadata,
  UUIDv7,
} from "@recourt/types";
import { uuidv7 } from "@recourt/utils";
import { ConflictError, InternalServerError, NotFoundError } from "@recourt/utils/error";

import { sha256Hex, type ArticleStore } from "./article-store/article-store";
import {
  createCasesRepository,
  type CasesRepository,
  type NewRevisionRecord,
  type RevisionRecord,
} from "./cases-repository";

export {
  createCasesRepository,
  type CasesRepository,
  type NewRevisionRecord,
  type RevisionRecord,
} from "./cases-repository";

const ARTICLE_SCHEMA_VERSIONS = {
  "2026-08": 1,
} as const;

export type CasesService = {
  createCase: (input: CreateRevisionBody) => Promise<CaseWithRevision>;
  createRevision: (caseId: UUIDv7, input: CreateRevisionBody) => Promise<CaseWithRevision>;
  listRevisions: (
    caseId: UUIDv7,
    input: { limit: number; offset: number },
  ) => Promise<ListCaseRevisionsResult>;
  getArticle: (caseId: UUIDv7, revisionId: UUIDv7) => Promise<CreateRevisionBody["article"]>;
  deleteRevision: (caseId: UUIDv7, revisionId: UUIDv7) => Promise<void>;
  publishRevision: (caseId: UUIDv7, revisionId: UUIDv7) => Promise<CaseWithRevision>;
};
function articleSchemaVersion(article: CreateRevisionBody["article"]): number {
  return ARTICLE_SCHEMA_VERSIONS[article.schema_version];
}

function entityLabel(entity: CreateRevisionBody["article"]["entities"][string]): string {
  switch (entity.type) {
    case "person":
    case "organization":
      return entity.name;
    case "statute":
    case "case":
    case "legal_term":
    case "source":
      return entity.title;
  }
}

function articleTitle(article: CreateRevisionBody["article"]): string {
  return article.title
    .map((part) => {
      if (part.type === "text") {
        return part.text.content;
      }

      const entity = article.entities[part.mention.entity_id];
      if (entity === undefined) {
        throw new InternalServerError("Article title references an unknown entity");
      }
      return entityLabel(entity);
    })
    .join("")
    .trim();
}

function toMetadata(record: RevisionRecord): RevisionMetadata {
  return {
    id: record.revisionId,
    title: record.title,
    comments: record.comments,
    court_case_id: record.courtCaseId,
    article_schema_version: record.articleSchemaVersion,
    status: record.status,
    created_at: record.createdAt.toISOString(),
    published_at: record.publishedAt?.toISOString() ?? null,
  };
}

function isKnownServiceError(
  error: unknown,
): error is NotFoundError | ConflictError | InternalServerError {
  return (
    error instanceof NotFoundError ||
    error instanceof ConflictError ||
    error instanceof InternalServerError
  );
}

function asServiceError(message: string, error: unknown): never {
  if (isKnownServiceError(error)) {
    throw error;
  }
  throw new InternalServerError(message, { cause: error });
}

function logDraftCleanupFailure(
  operation: string,
  location: { caseId: UUIDv7; revisionId: UUIDv7 },
  error: unknown,
) {
  console.error(
    JSON.stringify({
      message: "Draft article cleanup failed",
      operation,
      caseId: location.caseId,
      revisionId: location.revisionId,
      error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
    }),
  );
}

async function prepareRecord(
  caseId: UUIDv7,
  revisionId: UUIDv7,
  input: CreateRevisionBody,
): Promise<{ record: NewRevisionRecord; serialized: string }> {
  const serialized = JSON.stringify(input.article);
  return {
    serialized,
    record: {
      caseId,
      revisionId,
      title: articleTitle(input.article),
      comments: input.comments ?? null,
      courtCaseId: input.court_case_id ?? null,
      articleSchemaVersion: articleSchemaVersion(input.article),
      articleSha256: await sha256Hex(serialized),
    },
  };
}

async function createStoredRevision(
  articleStore: ArticleStore,
  createRecord: (record: NewRevisionRecord) => Promise<RevisionRecord | undefined>,
  caseId: UUIDv7,
  input: CreateRevisionBody,
): Promise<CaseWithRevision> {
  const revisionId = uuidv7();
  const location = { caseId, revisionId };
  const { record, serialized } = await prepareRecord(caseId, revisionId, input);

  try {
    await articleStore.putDraft(location, serialized, record.articleSha256);
    const created = await createRecord(record);
    if (created === undefined) {
      throw new NotFoundError("Case not found");
    }
    return { id: caseId, revision: toMetadata(created) };
  } catch (error) {
    const isExistingObjectConflict =
      error instanceof ConflictError && error.code === "ARTICLE_ALREADY_EXISTS";
    if (!isExistingObjectConflict) {
      try {
        await articleStore.deleteDraft(location);
      } catch (cleanupError) {
        logDraftCleanupFailure("create", location, cleanupError);
      }
    }
    throw error;
  }
}

async function createCase(
  repository: CasesRepository,
  articleStore: ArticleStore,
  input: CreateRevisionBody,
): Promise<CaseWithRevision> {
  try {
    const caseId = uuidv7();
    return await createStoredRevision(
      articleStore,
      (record) => repository.createCaseWithRevision(record),
      caseId,
      input,
    );
  } catch (error) {
    return asServiceError("Failed to create case", error);
  }
}

async function createRevision(
  repository: CasesRepository,
  articleStore: ArticleStore,
  caseId: UUIDv7,
  input: CreateRevisionBody,
): Promise<CaseWithRevision> {
  try {
    return await createStoredRevision(
      articleStore,
      (record) => repository.createRevision(record),
      caseId,
      input,
    );
  } catch (error) {
    return asServiceError("Failed to create revision", error);
  }
}

async function listRevisions(
  repository: CasesRepository,
  caseId: UUIDv7,
  input: { limit: number; offset: number },
): Promise<ListCaseRevisionsResult> {
  try {
    const result = await repository.listRevisions(caseId, input);
    if (result === undefined) {
      throw new NotFoundError("Case not found");
    }
    return {
      id: caseId,
      revisions: result.rows.map(toMetadata),
      pagination: { ...input, total: result.total },
    };
  } catch (error) {
    return asServiceError("Failed to list revisions", error);
  }
}

async function getArticle(
  repository: CasesRepository,
  articleStore: ArticleStore,
  caseId: UUIDv7,
  revisionId: UUIDv7,
): Promise<CreateRevisionBody["article"]> {
  try {
    const record = await repository.findRevision(caseId, revisionId);
    if (record === undefined) {
      throw new NotFoundError("Revision not found");
    }
    if (record.status === "deleting") {
      throw new ConflictError("Revision is being deleted", "REVISION_NOT_READABLE");
    }

    const location = { caseId, revisionId };
    const stored =
      record.status === "published"
        ? await articleStore.getPublished(location)
        : ((await articleStore.getDraft(location)) ??
          (record.status === "publishing" ? await articleStore.getPublished(location) : undefined));

    if (stored === undefined) {
      throw new NotFoundError("Article not found");
    }
    if (stored.sha256 !== record.articleSha256) {
      throw new ConflictError(
        "Article content does not match the revision",
        "ARTICLE_CONTENT_CONFLICT",
      );
    }
    return stored.article;
  } catch (error) {
    return asServiceError("Failed to get article", error);
  }
}

async function deleteRevision(
  repository: CasesRepository,
  articleStore: ArticleStore,
  caseId: UUIDv7,
  revisionId: UUIDv7,
): Promise<void> {
  try {
    let record = await repository.findRevision(caseId, revisionId);
    if (record === undefined) {
      throw new NotFoundError("Revision not found");
    }

    if (record.status === "draft") {
      record =
        (await repository.transitionRevision(caseId, revisionId, "draft", "deleting")) ??
        (await repository.findRevision(caseId, revisionId));
    }
    if (record === undefined) {
      return;
    }
    if (record.status !== "deleting") {
      throw new ConflictError("Only draft revisions can be deleted", "REVISION_NOT_DELETABLE");
    }

    await articleStore.deleteDraft({ caseId, revisionId });
    await repository.deleteRevision(caseId, revisionId);
  } catch (error) {
    return asServiceError("Failed to delete revision", error);
  }
}

async function publishRevision(
  repository: CasesRepository,
  articleStore: ArticleStore,
  caseId: UUIDv7,
  revisionId: UUIDv7,
): Promise<CaseWithRevision> {
  try {
    let record = await repository.findRevision(caseId, revisionId);
    if (record === undefined) {
      throw new NotFoundError("Revision not found");
    }
    if (record.status === "deleting") {
      throw new ConflictError(
        "A deleting revision cannot be published",
        "REVISION_NOT_PUBLISHABLE",
      );
    }

    if (record.status === "draft") {
      record =
        (await repository.transitionRevision(caseId, revisionId, "draft", "publishing")) ??
        (await repository.findRevision(caseId, revisionId));
    }
    if (record === undefined || record.status === "deleting") {
      throw new ConflictError(
        "Revision cannot be published from its current state",
        "REVISION_NOT_PUBLISHABLE",
      );
    }

    const location = { caseId, revisionId };
    await articleStore.publishDraft(location, record.articleSha256);

    if (record.status === "publishing") {
      record =
        (await repository.transitionRevision(caseId, revisionId, "publishing", "published")) ??
        (await repository.findRevision(caseId, revisionId));
    }
    if (record === undefined || record.status !== "published") {
      throw new ConflictError("Revision publication did not complete", "REVISION_NOT_PUBLISHABLE");
    }

    try {
      await articleStore.deleteDraft(location);
    } catch (cleanupError) {
      logDraftCleanupFailure("publish", location, cleanupError);
    }

    return { id: caseId, revision: toMetadata(record) };
  } catch (error) {
    return asServiceError("Failed to publish revision", error);
  }
}

export function createCasesService(
  connectionString: string,
  articleStore: ArticleStore,
  repository: CasesRepository = createCasesRepository(connectionString),
): CasesService {
  return {
    createCase: (input) => createCase(repository, articleStore, input),
    createRevision: (caseId, input) => createRevision(repository, articleStore, caseId, input),
    listRevisions: (caseId, input) => listRevisions(repository, caseId, input),
    getArticle: (caseId, revisionId) => getArticle(repository, articleStore, caseId, revisionId),
    deleteRevision: (caseId, revisionId) =>
      deleteRevision(repository, articleStore, caseId, revisionId),
    publishRevision: (caseId, revisionId) =>
      publishRevision(repository, articleStore, caseId, revisionId),
  };
}
