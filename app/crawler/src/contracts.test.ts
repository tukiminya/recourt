import { crawlerQueueMessage, extractQueueMessage } from "@recourt/types/courts";
import { describe, expect, it } from "vitest";

const crawlRunId = "018f47a2-6c98-7a12-8a4f-123456789abc";
const source = {
  provider: "courts_go_jp" as const,
  courtDetailId: "97044",
  detailUrl: "https://www.courts.go.jp/hanrei/97044/detail2/index.html",
  caseNumber: "令和5(レ)1234",
  caseName: null,
  decisionDate: null,
  courtName: "東京地方裁判所",
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

describe("crawler queue contracts", () => {
  it("keeps the HTML detail URL separate from the extraction PDF URL", () => {
    expect(
      crawlerQueueMessage.parse({
        version: 1,
        crawlRunId,
        jobId: `case-${crawlRunId}-97044`,
        category: "saikosai",
        courtDetailId: "97044",
        detailUrl: "https://www.courts.go.jp/hanrei/97044/detail2/index.html",
      }).detailUrl,
    ).toContain("/detail2/index.html");

    expect(
      extractQueueMessage.parse({
        version: 1,
        crawlRunId,
        jobId: "extract-abc",
        courtCaseId: {
          court_name: "東京地方裁判所",
          branch_name: null,
          era: "reiwa",
          year: 5,
          type: "レ",
          number: 1234,
        },
        source,
        pdfUrl: "https://www.courts.go.jp/assets/hanrei/hanrei-pdf-97044.pdf",
      }).pdfUrl,
    ).toContain(".pdf");
  });

  it("rejects unknown versions and categories", () => {
    expect(
      crawlerQueueMessage.safeParse({
        version: 2,
        crawlRunId,
        jobId: "job",
        category: "search2",
        courtDetailId: "97044",
        detailUrl: "https://www.courts.go.jp/hanrei/97044/detail2/index.html",
      }).success,
    ).toBe(false);
  });
});
