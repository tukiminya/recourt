export const normalizeText = (value: string | null | undefined) => {
  // 空値は空文字に統一する。
  if (!value) {
    return "";
  }
  return value.replace(/\s+/g, " ").trim();
};

export const normalizeDate = (value: string | null | undefined) => {
  // 空値は空文字に統一する。
  if (!value) {
    return "";
  }
  // 裁判所ページのISO形式/和暦表記の両方を許容する。
  const trimmed = normalizeText(value);
  const simple = trimmed.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  // ISO風の日付表記を優先して正規化する。
  if (simple) {
    const year = simple[1];
    const month = simple[2].padStart(2, "0");
    const day = simple[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const jp = trimmed.match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/);
  // 和暦の年月日表記も同じISO形式に正規化する。
  if (jp) {
    const year = jp[1];
    const month = jp[2].padStart(2, "0");
    const day = jp[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const era = trimmed.match(/(令和|平成|昭和)(元|\d{1,2})年\s*(\d{1,2})月\s*(\d{1,2})日/);
  // 令和/平成/昭和の和暦を西暦に変換する。
  if (era) {
    const eraName = era[1];
    const eraYear = era[2] === "元" ? 1 : Number(era[2]);
    const month = era[3].padStart(2, "0");
    const day = era[4].padStart(2, "0");
    const baseYear = eraName === "令和" ? 2018 : eraName === "平成" ? 1988 : 1925;
    const year = String(baseYear + eraYear);
    return `${year}-${month}-${day}`;
  }
  return "";
};
