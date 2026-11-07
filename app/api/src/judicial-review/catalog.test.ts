import { describe, expect, it } from "vitest";
import { getJudgeCases, getReviewCatalog, getReviewJudge, reviewEditions } from "./catalog";

describe("published judicial reading material", () => {
  it("has unique editions, resolvable authors and source pages within the official PDFs", () => {
    expect(new Set(reviewEditions.map((edition) => edition.version)).size).toBe(
      reviewEditions.length,
    );
    const pdfPages: Record<string, number> = {
      "gender-recognition-2023": 36,
      "overseas-review-2022": 18,
      "married-surnames-2021": 49,
    };
    for (const edition of reviewEditions) {
      expect(getReviewCatalog(edition.version)).toBe(edition);
      expect(new Set(edition.judges.map((judge) => judge.id)).size).toBe(edition.judges.length);
      expect(new Set(edition.cases.map((courtCase) => courtCase.id)).size).toBe(
        edition.cases.length,
      );
      for (const courtCase of edition.cases) {
        expect(new URL(courtCase.pdfUrl).origin).toBe("https://www.courts.go.jp");
        expect(new URL(courtCase.detailUrl).origin).toBe("https://www.courts.go.jp");
        expect(new Set(courtCase.opinions.map((opinion) => opinion.judgeId)).size).toBe(
          courtCase.opinions.length,
        );
        for (const pages of [
          courtCase.conclusionPages,
          ...courtCase.opinions.map((opinion) => opinion.pages),
        ]) {
          expect(pages[0]).toBeGreaterThan(0);
          expect(pages[1]).toBeGreaterThanOrEqual(pages[0]);
          expect(pages[1]).toBeLessThanOrEqual(pdfPages[courtCase.id]);
        }
        for (const opinion of courtCase.opinions)
          expect(getReviewJudge(opinion.judgeId, edition.version)).toBeDefined();
      }
      for (const judge of edition.judges) {
        const cases = getJudgeCases(judge.id, edition.version);
        expect(cases.length).toBeGreaterThan(0);
        expect(cases.map((courtCase) => courtCase.date)).toEqual(
          cases
            .map((courtCase) => courtCase.date)
            .sort()
            .reverse(),
        );
      }
    }
  });
  it("does not substitute the latest material for an unknown edition or judge", () => {
    expect(getReviewCatalog("missing")).toBeUndefined();
    expect(getReviewJudge("unknown")).toBeUndefined();
    expect(getJudgeCases("uga-katsuya", "missing")).toEqual([]);
  });
});
