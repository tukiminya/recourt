import { describe, expect, it } from "vitest";

import { courtCaseIdFromSource, extractWorkflowId } from "./court-case-identity";

const source = {
  provider: "courts_go_jp" as const,
  courtDetailId: "97044",
  detailUrl: "https://www.courts.go.jp/hanrei/97044/detail2/index.html",
  caseNumber: "令和5年（レ）第1234号",
  caseName: null,
  decisionDate: null,
  courtName: "東京地方裁判所立川支部 民事第2部",
  judgmentType: null,
  result: null,
  collectionCitation: null,
  originalCourtName: null,
  originalCaseNumber: null,
  originalDecisionDate: null,
  holding: null,
  summary: null,
  referencedLaws: null,
  rawMetadata: {},
  documents: [],
};

describe("court case identity", () => {
  it("normalizes the court, branch, and complete case number", () => {
    expect(courtCaseIdFromSource(source)).toEqual({
      court_name: "東京地方裁判所",
      branch_name: "立川支部",
      era: "reiwa",
      year: 5,
      type: "レ",
      number: 1234,
    });
  });

  it("does not use the mutable detail ID in the extraction workflow ID", async () => {
    const courtCaseId = courtCaseIdFromSource(source);
    const pdfUrl = "https://www.courts.go.jp/assets/hanrei/hanrei-pdf-97044.pdf";
    const first = await extractWorkflowId(courtCaseId, pdfUrl);
    const second = await extractWorkflowId(
      courtCaseIdFromSource({ ...source, courtDetailId: "99999" }),
      pdfUrl,
    );

    expect(first).toBe(second);
    expect(first).toMatch(/^extract-[0-9a-f]{64}$/);
  });
});
