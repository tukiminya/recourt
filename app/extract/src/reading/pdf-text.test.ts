import { describe, expect, it } from "vitest";
import { buildJudgmentText, extractJudgmentText, UnsupportedJudgmentError } from "./pdf-text";
import { validateClassification } from "./classify";
const pageText = "裁判所の判断と当事者の主張を区別して原文を確認します。".repeat(80);
describe("judgment preparation", () => {
  it("keeps page boundaries and exact source fragments", () => {
    const result = buildJudgmentText([
      { page: 1, text: pageText },
      { page: 2, text: pageText },
    ]);
    expect(
      result.passages
        .filter((p) => p.page === 1)
        .map((p) => p.text)
        .join(""),
    ).toBe(pageText);
    expect(
      result.passages
        .filter((p) => p.page === 2)
        .map((p) => p.text)
        .join(""),
    ).toBe(pageText);
    expect(result.passages.find((p) => p.id === "p2-1")?.page).toBe(2);
  });
  it("holds scanned, oversized, incomplete and broken PDFs without truncation", async () => {
    for (const pages of [
      [{ page: 1, text: "" }],
      [
        { page: 1, text: pageText },
        { page: 2, text: "" },
      ],
      Array.from({ length: 101 }, (_, i) => ({ page: i + 1, text: pageText })),
      [{ page: 1, text: pageText.repeat(40) }],
    ]) {
      expect(() => buildJudgmentText(pages)).toThrow(UnsupportedJudgmentError);
    }
    await expect(extractJudgmentText(new Uint8Array([1, 2, 3]))).rejects.toMatchObject({
      reason: "INVALID_PDF",
    });
  });
  it("validates classification evidence and normalizes topic aliases", () => {
    const text = buildJudgmentText([{ page: 1, text: pageText }]);
    const value = {
      title: "裁判",
      description: "説明",
      descriptionPassageIds: ["p1-1"],
      topics: [
        { label: "婚姻", passageIds: ["p1-1"] },
        { label: "結婚", passageIds: ["p1-1"] },
      ],
    };
    expect(validateClassification(value, text).topics).toEqual(["結婚"]);
    expect(() =>
      validateClassification({ ...value, descriptionPassageIds: ["p999-1"] }, text),
    ).toThrow(/unknown passage/);
  });
});
