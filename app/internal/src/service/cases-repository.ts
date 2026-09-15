import {
  and,
  case_id_by_courts,
  case_revisions,
  cases,
  count,
  db,
  desc,
  eq,
} from "@recourt/database";
import type { CaseCourtId, RevisionStatus, UUIDv7 } from "@recourt/types";
import { uuidv7 } from "@recourt/utils";
import { InternalServerError } from "@recourt/utils/error";

export type RevisionRecord = {
  caseId: UUIDv7;
  revisionId: UUIDv7;
  title: string;
  comments: string | null;
  courtCaseId: CaseCourtId | null;
  articleSchemaVersion: number;
  articleSha256: string;
  status: RevisionStatus;
  createdAt: Date;
  publishedAt: Date | null;
};

export type NewRevisionRecord = Omit<RevisionRecord, "createdAt" | "publishedAt" | "status">;

export type CasesRepository = {
  createCaseWithRevision: (record: NewRevisionRecord) => Promise<RevisionRecord>;
  createRevision: (record: NewRevisionRecord) => Promise<RevisionRecord | undefined>;
  listRevisions: (
    caseId: UUIDv7,
    input: { limit: number; offset: number },
  ) => Promise<{ rows: RevisionRecord[]; total: number } | undefined>;
  findRevision: (caseId: UUIDv7, revisionId: UUIDv7) => Promise<RevisionRecord | undefined>;
  transitionRevision: (
    caseId: UUIDv7,
    revisionId: UUIDv7,
    from: RevisionStatus,
    to: RevisionStatus,
  ) => Promise<RevisionRecord | undefined>;
  deleteRevision: (caseId: UUIDv7, revisionId: UUIDv7) => Promise<boolean>;
};

type Database = ReturnType<typeof db>;

const revisionFields = {
  caseId: case_revisions.case_id,
  revisionId: case_revisions.id,
  title: case_revisions.title,
  comments: case_revisions.comments,
  articleSchemaVersion: case_revisions.article_schema_version,
  articleSha256: case_revisions.article_sha256,
  status: case_revisions.status,
  createdAt: case_revisions.created_at,
  publishedAt: case_revisions.published_at,
  courtRandomId: case_id_by_courts.random_id,
  courtEra: case_id_by_courts.era,
  courtYear: case_id_by_courts.year,
  courtType: case_id_by_courts.type,
  courtNumber: case_id_by_courts.case_id,
};

type SelectedRevision = {
  caseId: UUIDv7;
  revisionId: UUIDv7;
  title: string;
  comments: string | null;
  articleSchemaVersion: number;
  articleSha256: string;
  status: RevisionStatus;
  createdAt: Date;
  publishedAt: Date | null;
  courtRandomId: UUIDv7 | null;
  courtEra: CaseCourtId["era"] | null;
  courtYear: number | null;
  courtType: string | null;
  courtNumber: number | null;
};

function toRevisionRecord(row: SelectedRevision): RevisionRecord {
  let courtCaseId: CaseCourtId | null = null;
  if (row.courtRandomId !== null) {
    if (
      row.courtEra === null ||
      row.courtYear === null ||
      row.courtType === null ||
      row.courtNumber === null
    ) {
      throw new InternalServerError("Court case identifier is incomplete");
    }
    courtCaseId = {
      era: row.courtEra,
      year: row.courtYear,
      type: row.courtType,
      number: row.courtNumber,
    };
  }

  return {
    caseId: row.caseId,
    revisionId: row.revisionId,
    title: row.title,
    comments: row.comments,
    courtCaseId,
    articleSchemaVersion: row.articleSchemaVersion,
    articleSha256: row.articleSha256,
    status: row.status,
    createdAt: row.createdAt,
    publishedAt: row.publishedAt,
  };
}

async function resolveCourtCaseId(
  database: Database,
  courtCaseId: CaseCourtId | null,
): Promise<UUIDv7 | null> {
  if (courtCaseId === null) {
    return null;
  }

  const naturalKey = {
    era: courtCaseId.era,
    year: courtCaseId.year,
    type: courtCaseId.type,
    case_id: courtCaseId.number,
  };
  const [inserted] = await database
    .insert(case_id_by_courts)
    .values({ random_id: uuidv7(), ...naturalKey })
    .onConflictDoNothing({
      target: [
        case_id_by_courts.era,
        case_id_by_courts.year,
        case_id_by_courts.type,
        case_id_by_courts.case_id,
      ],
    })
    .returning({ id: case_id_by_courts.random_id });

  if (inserted !== undefined) {
    return inserted.id;
  }

  const [existing] = await database
    .select({ id: case_id_by_courts.random_id })
    .from(case_id_by_courts)
    .where(
      and(
        eq(case_id_by_courts.era, courtCaseId.era),
        eq(case_id_by_courts.year, courtCaseId.year),
        eq(case_id_by_courts.type, courtCaseId.type),
        eq(case_id_by_courts.case_id, courtCaseId.number),
      ),
    )
    .limit(1);

  if (existing === undefined) {
    throw new InternalServerError("Court case identifier upsert did not return a row");
  }

  return existing.id;
}

async function findRevision(
  database: Database,
  caseId: UUIDv7,
  revisionId: UUIDv7,
): Promise<RevisionRecord | undefined> {
  const [row] = await database
    .select(revisionFields)
    .from(case_revisions)
    .leftJoin(case_id_by_courts, eq(case_revisions.case_id_by_courts, case_id_by_courts.random_id))
    .where(and(eq(case_revisions.case_id, caseId), eq(case_revisions.id, revisionId)))
    .limit(1);

  return row === undefined ? undefined : toRevisionRecord(row);
}

async function createCaseWithRevision(
  database: Database,
  record: NewRevisionRecord,
): Promise<RevisionRecord> {
  const courtRandomId = await resolveCourtCaseId(database, record.courtCaseId);

  await database.transaction(async (transaction) => {
    await transaction.insert(cases).values({ id: record.caseId });
    await transaction.insert(case_revisions).values({
      id: record.revisionId,
      case_id: record.caseId,
      case_id_by_courts: courtRandomId,
      comments: record.comments,
      title: record.title,
      article_schema_version: record.articleSchemaVersion,
      article_sha256: record.articleSha256,
      status: "draft",
    });
  });

  const created = await findRevision(database, record.caseId, record.revisionId);
  if (created === undefined) {
    throw new InternalServerError("Created revision could not be read");
  }
  return created;
}

async function createRevision(
  database: Database,
  record: NewRevisionRecord,
): Promise<RevisionRecord | undefined> {
  const [existingCase] = await database
    .select({ id: cases.id })
    .from(cases)
    .where(eq(cases.id, record.caseId))
    .limit(1);
  if (existingCase === undefined) {
    return undefined;
  }

  const courtRandomId = await resolveCourtCaseId(database, record.courtCaseId);
  await database.insert(case_revisions).values({
    id: record.revisionId,
    case_id: record.caseId,
    case_id_by_courts: courtRandomId,
    comments: record.comments,
    title: record.title,
    article_schema_version: record.articleSchemaVersion,
    article_sha256: record.articleSha256,
    status: "draft",
  });

  return await findRevision(database, record.caseId, record.revisionId);
}

async function listRevisions(
  database: Database,
  caseId: UUIDv7,
  input: { limit: number; offset: number },
): Promise<{ rows: RevisionRecord[]; total: number } | undefined> {
  const [existingCase] = await database
    .select({ id: cases.id })
    .from(cases)
    .where(eq(cases.id, caseId))
    .limit(1);
  if (existingCase === undefined) {
    return undefined;
  }

  const [rows, totals] = await Promise.all([
    database
      .select(revisionFields)
      .from(case_revisions)
      .leftJoin(
        case_id_by_courts,
        eq(case_revisions.case_id_by_courts, case_id_by_courts.random_id),
      )
      .where(eq(case_revisions.case_id, caseId))
      .orderBy(desc(case_revisions.created_at), desc(case_revisions.id))
      .limit(input.limit)
      .offset(input.offset),
    database
      .select({ total: count() })
      .from(case_revisions)
      .where(eq(case_revisions.case_id, caseId)),
  ]);

  return {
    rows: rows.map(toRevisionRecord),
    total: totals[0]?.total ?? 0,
  };
}

async function transitionRevision(
  database: Database,
  location: { caseId: UUIDv7; revisionId: UUIDv7 },
  from: RevisionStatus,
  to: RevisionStatus,
): Promise<RevisionRecord | undefined> {
  const publishedAt = to === "published" ? new Date() : null;
  const [updated] = await database
    .update(case_revisions)
    .set({ status: to, published_at: publishedAt })
    .where(
      and(
        eq(case_revisions.case_id, location.caseId),
        eq(case_revisions.id, location.revisionId),
        eq(case_revisions.status, from),
      ),
    )
    .returning({ id: case_revisions.id });

  return updated === undefined
    ? undefined
    : await findRevision(database, location.caseId, location.revisionId);
}

async function deleteRevision(
  database: Database,
  caseId: UUIDv7,
  revisionId: UUIDv7,
): Promise<boolean> {
  const [deleted] = await database
    .delete(case_revisions)
    .where(
      and(
        eq(case_revisions.case_id, caseId),
        eq(case_revisions.id, revisionId),
        eq(case_revisions.status, "deleting"),
      ),
    )
    .returning({ id: case_revisions.id });
  return deleted !== undefined;
}

export function createCasesRepository(connectionString: string): CasesRepository {
  const database = db(connectionString);
  return {
    createCaseWithRevision: (record) => createCaseWithRevision(database, record),
    createRevision: (record) => createRevision(database, record),
    listRevisions: (caseId, input) => listRevisions(database, caseId, input),
    findRevision: (caseId, revisionId) => findRevision(database, caseId, revisionId),
    transitionRevision: (caseId, revisionId, from, to) =>
      transitionRevision(database, { caseId, revisionId }, from, to),
    deleteRevision: (caseId, revisionId) => deleteRevision(database, caseId, revisionId),
  };
}
