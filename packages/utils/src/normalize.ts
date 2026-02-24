export const normalizeText = (value: string | null | undefined) => {
  // 空値は空文字に統一する。
  if (!value) {
    return "";
  }
  return value.replace(/\s+/g, " ").trim();
};
