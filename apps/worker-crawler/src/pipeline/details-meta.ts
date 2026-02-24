import { normalizeText } from "@recourt/utils";
import * as cheerio from "cheerio";
import type { CrawlerQueuePayload, RawDetailsMetadata } from "@/types";

export const extractRawDetailMetadata = async (
  payload: CrawlerQueuePayload,
): Promise<RawDetailsMetadata> => {
  const html = await (await fetch(payload.url)).text();
  const $ = cheerio.load(html);

  const getDetailValue = (label: string) => {
    const entry = $(".module-sub-page-parts-table dl")
      .filter((_, element) => normalizeText($(element).children("dt").text()) === label)
      .first();
    if (!entry.length) {
      return "";
    }
    return normalizeText(entry.children("dd").text());
  };

  const pdfHref = normalizeText($(".module-sub-page-parts-table a[href$='.pdf']").attr("href"));
  const pdfUrl = new URL(pdfHref, payload.url);

  const extractedValue: RawDetailsMetadata = {
    jiken_code: getDetailValue("事件番号"),
    jiken_name: getDetailValue("事件名"),
    saiban_date: getDetailValue("裁判年月日"),
    houtei_name: getDetailValue("法廷名"),
    saiban_type: getDetailValue("裁判種別"),
    saiban_result: getDetailValue("結果"),
    pdf: pdfUrl.toString(),
  };

  return extractedValue;
};
