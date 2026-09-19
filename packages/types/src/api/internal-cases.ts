import { z } from "zod";

import { LatestCaseArticleStorage } from "../storage/entry";
import type { UUIDv7 } from "../uuid";

export const caseCourtId = z.object({
  court_name: z.string().trim().min(1),
  branch_name: z.string().trim().min(1).nullable(),
  era: z.enum(["showa", "heisei", "reiwa"]),
  year: z.number().int().positive().max(32_767),
  type: z.string().trim().min(1),
  number: z.number().int().positive().max(2_147_483_647),
});

export type CaseCourtId = z.infer<typeof caseCourtId>;

export const createRevisionBody = z.object({
  article: LatestCaseArticleStorage,
  comments: z.string().nullable().optional(),
  court_case_id: caseCourtId.nullable().optional(),
});

export type CreateRevisionBody = z.infer<typeof createRevisionBody>;

export const revisionStatus = z.enum(["draft", "publishing", "published", "deleting"]);

export type RevisionStatus = z.infer<typeof revisionStatus>;

export type RevisionMetadata = {
  id: UUIDv7;
  title: string;
  comments: string | null;
  court_case_id: CaseCourtId | null;
  article_schema_version: number;
  status: RevisionStatus;
  created_at: string;
  published_at: string | null;
};

export type CaseWithRevision = {
  id: UUIDv7;
  revision: RevisionMetadata;
};

export type ListCaseRevisionsResult = {
  id: UUIDv7;
  revisions: RevisionMetadata[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
};
