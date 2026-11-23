import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { READING_VERSION, type PreparedJudgment } from "@recourt/types";
import { openTestStorage } from "../../../../packages/database/test/storage";
import { createCaseReadingService } from "./case-reading";

let storage: Awaited<ReturnType<typeof openTestStorage>>;
beforeAll(async () => {
  storage = await openTestStorage();
});
afterAll(async () => {
  await storage?.dispose();
});

const pdf = "x".repeat(100);
const text = {
  version: 1,
  pages: [{ page: 1, text: "原文" }],
  passages: [{ id: "p1-1", page: 1, text: "原文" }],
};
const sha256 = createHash("sha256").update(pdf).digest("hex");
const serialized = JSON.stringify(text);
const textSha256 = createHash("sha256").update(serialized).digest("hex");
const prefix = `judgment/${sha256}/v${READING_VERSION}/`;
const input = {
  courtCaseId: {
    court_name: "最高裁判所",
    branch_name: null,
    era: "reiwa",
    year: 1,
    type: "あ",
    number: 1,
  },
  source: {
    provider: "courts_go_jp",
    courtDetailId: "1",
    detailUrl: "https://www.courts.go.jp/hanrei/1/detail2/index.html",
    caseNumber: "令和1(あ)1",
    caseName: null,
    decisionDate: "令和元年5月1日",
    courtName: "最高裁判所",
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
    documents: [
      { role: "full_text", label: "判決", url: "https://www.courts.go.jp/hanrei/1/source.pdf" },
    ],
  },
  sha256,
  processingVersion: READING_VERSION,
  pdfKey: `${prefix}source.pdf`,
  textKey: `${prefix}text.json`,
  textSha256,
  pageCount: 1,
  status: "ready",
  holdReason: null,
  title: "裁判",
  description: "説明",
  topics: ["殺人", "同性結婚"],
} satisfies PreparedJudgment;

describe("reading storage in D1", () => {
  it("registers a document and its topics once, then serves its pinned text and PDF", async () => {
    const { DB, CASE_DOCUMENTS: bucket } = storage.env;
    await bucket.put(input.pdfKey, pdf, { customMetadata: { sha256 } });
    await bucket.put(input.textKey, serialized, { customMetadata: { sha256: textSha256 } });
    const service = createCaseReadingService(DB, bucket);

    const results = await Promise.all([service.register(input), service.register(input)]);
    const [{ caseId, documentId }] = results;
    expect(results.filter(({ created }) => created)).toHaveLength(1);
    expect(results[1]).toMatchObject({ caseId, documentId });
    expect(await service.register({ ...input, topics: ["重複時の別トピック"] })).toEqual({
      caseId,
      documentId,
      created: false,
    });

    const topics = ["同性婚", "殺人", "結婚"].map((id) => ({ id, label: id }));
    expect(await service.topics()).toEqual({ topics: topics.map((topic) => ({ ...topic, count: 1 })) });
    const manyTopics = [...Array.from({ length: 110 }, (_, index) => String(index)), "殺人"];
    const page = await service.list(manyTopics, 0);
    expect(page.total).toBe(1);
    expect(page.cases[0]).toMatchObject({
      id: caseId,
      documentId,
      topics,
      pageCount: 1,
      decisionDate: "2019-05-01",
    });
    expect(await service.list(["殺人"], 20)).toMatchObject({ cases: [], total: 1 });
    expect(await service.getCase(caseId)).toEqual(page.cases[0]);
    expect(await service.getDocument(caseId, documentId)).toEqual({ case: page.cases[0], text });
    await expect(service.getDocument(caseId, crypto.randomUUID())).rejects.toThrow("Document not found");
    expect(await service.findPrepared(input.courtCaseId, sha256, READING_VERSION)).toEqual({
      document: { caseId, documentId, status: "ready" },
    });

    const suffix = await service.pdf(caseId, documentId, new Headers({ Range: "bytes=-10" }));
    expect(suffix.status).toBe(206);
    expect(suffix.headers.get("Content-Range")).toBe("bytes 90-99/100");
    expect(await suffix.text()).toBe("x".repeat(10));
    const bad = await service.pdf(caseId, documentId, new Headers({ Range: "bytes=100-" }));
    expect(bad.status).toBe(416);
    expect(bad.headers.get("Content-Range")).toBe("bytes */100");
  });

  it("grants one concurrent lease and leaves the global gate open when a lease is rejected", async () => {
    const { DB, CASE_DOCUMENTS: bucket } = storage.env;
    const service = createCaseReadingService(DB, bucket);
    const attempts = await Promise.allSettled([
      service.claimClassification("first", READING_VERSION, "reader-1"),
      service.claimClassification("second", READING_VERSION, "reader-2"),
    ]);
    expect(attempts.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    const first = attempts[0].status === "fulfilled" ? "first" : "second";
    const second = first === "first" ? "second" : "first";
    expect(await DB.prepare("SELECT source_sha256 FROM case_classification_jobs").all()).toMatchObject({
      results: [{ source_sha256: first }],
    });

    await DB.prepare("UPDATE case_ai_gate SET next_start = 0").run();
    await expect(service.claimClassification(first, READING_VERSION, "another-reader")).rejects.toMatchObject({
      code: "CLASSIFICATION_BUSY",
    });
    await expect(service.claimClassification(second, READING_VERSION, "another-reader")).resolves.toEqual({
      claimed: true,
    });
  });
});
