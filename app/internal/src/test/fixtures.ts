import type { CaseWithRevision, CreateRevisionBody } from "@recourt/types";
import { uuidv7 } from "@recourt/utils";

export const caseId = uuidv7();
export const revisionId = uuidv7();

export const createBody: CreateRevisionBody = {
  article: {
    schema_version: "2026-08",
    id: "550e8400-e29b-41d4-a716-446655440000",
    created_time: "2026-09-10T00:00:00.000Z",
    title: [
      {
        type: "text",
        text: { content: "損害賠償請求事件（", link: null },
        annotations: { bold: false, underline: false, strikethrough: false },
      },
      {
        type: "mention",
        mention: { entity_id: "court", entity_type: "organization" },
        annotations: { bold: true, underline: false, strikethrough: false },
      },
      {
        type: "text",
        text: { content: "）", link: null },
        annotations: { bold: false, underline: false, strikethrough: false },
      },
    ],
    entities: {
      court: {
        type: "organization",
        name: "最高裁判所",
        description: null,
        url: null,
      },
    },
    sections: [],
    summary: { type: "opening_and_closing", items: [] },
  },
  comments: "初稿",
  court_case_id: { era: "reiwa", year: 8, type: "受", number: 42 },
};

export const caseWithRevision: CaseWithRevision = {
  id: caseId,
  revision: {
    id: revisionId,
    title: "損害賠償請求事件（最高裁判所）",
    comments: "初稿",
    court_case_id: createBody.court_case_id ?? null,
    article_schema_version: 1,
    status: "draft",
    created_at: "2026-09-10T00:00:00.000Z",
    published_at: null,
  },
};
