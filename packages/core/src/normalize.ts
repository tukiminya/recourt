export const normalizeJudgeName = (name: string) =>
  name.normalize("NFKC").replace(/\s+/g, "").trim();

export const normalizeKeySegment = (value: string) =>
  value.normalize("NFKC").replace(/[\\/]/g, "_").trim();
