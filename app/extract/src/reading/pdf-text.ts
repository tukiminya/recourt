import { getDocumentProxy } from "unpdf";
import { judgmentText, MAX_CASE_PAGES, MAX_CASE_TEXT, type JudgmentText } from "@recourt/types";

export class UnsupportedJudgmentError extends Error {
  constructor(
    readonly reason: string,
    readonly pageCount = 0,
  ) {
    super(reason);
  }
}

export function buildJudgmentText(pages: JudgmentText["pages"]): JudgmentText {
  if (pages.length > MAX_CASE_PAGES)
    throw new UnsupportedJudgmentError("TOO_MANY_PAGES", pages.length);
  if (pages.length === 0 || pages.some((page) => page.text.replace(/\s/g, "").length < 40))
    throw new UnsupportedJudgmentError("TEXT_EXTRACTION_INCOMPLETE", pages.length);
  if (pages.reduce((total, page) => total + page.text.length, 0) > MAX_CASE_TEXT)
    throw new UnsupportedJudgmentError("TEXT_TOO_LONG", pages.length);
  const passages = pages.flatMap(({ page, text }) => {
    const result: JudgmentText["passages"] = [];
    for (let start = 0, index = 1; start < text.length; start += 1_200, index++) {
      const fragment = text.slice(start, start + 1_200);
      if (fragment.length) result.push({ id: `p${page}-${index}`, page, text: fragment });
    }
    return result;
  });
  return judgmentText.parse({ version: 1, pages, passages });
}

export async function extractJudgmentText(bytes: Uint8Array): Promise<JudgmentText> {
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>>;
  try {
    pdf = await getDocumentProxy(bytes, {
      maxImageSize: 1,
      useSystemFonts: false,
      cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.1.200/cmaps/",
      cMapPacked: true,
      standardFontDataUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.1.200/standard_fonts/",
      useWorkerFetch: true,
    });
  } catch {
    throw new UnsupportedJudgmentError("INVALID_PDF");
  }
  try {
    if (pdf.numPages > MAX_CASE_PAGES)
      throw new UnsupportedJudgmentError("TOO_MANY_PAGES", pdf.numPages);
    const pages: JudgmentText["pages"] = [];
    let length = 0;
    for (let page = 1; page <= pdf.numPages; page++) {
      const content = await (await pdf.getPage(page)).getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str + (item.hasEOL ? "\n" : " ") : ""))
        .join("")
        .trim();
      length += text.length;
      if (length > MAX_CASE_TEXT) throw new UnsupportedJudgmentError("TEXT_TOO_LONG", pdf.numPages);
      pages.push({ page, text });
    }
    return buildJudgmentText(pages);
  } catch (error) {
    if (error instanceof UnsupportedJudgmentError) throw error;
    throw new UnsupportedJudgmentError("TEXT_EXTRACTION_FAILED", pdf.numPages);
  } finally {
    await pdf.loadingTask.destroy();
  }
}
