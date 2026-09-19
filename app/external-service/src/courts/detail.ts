import { courtCaseSource, type CourtCaseSource } from "@recourt/types/courts";

const COURTS_ORIGIN = "https://www.courts.go.jp";
const MAX_HTML_BYTES = 5 * 1024 * 1024;

export class InvalidCourtDetailUrlError extends Error {}
export class CourtDetailFormatError extends Error {}

export function validateCourtDetailUrl(value: string): { url: URL; courtDetailId: string } {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new InvalidCourtDetailUrlError("The court detail URL is invalid");
  }

  const match = url.pathname.match(/^\/hanrei\/(\d+)\/detail\d+\/index\.html$/);
  if (
    url.origin !== COURTS_ORIGIN ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== "" ||
    match === null
  ) {
    throw new InvalidCourtDetailUrlError("The court detail URL is not allowed");
  }
  return { url, courtDetailId: match[1] };
}

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function optional(raw: Record<string, string>, label: string): string | null {
  return raw[label] || null;
}

function courtAssetUrl(href: string | null, base: URL): URL | null {
  if (!href) return null;
  try {
    const url = new URL(href, base);
    return url.origin === COURTS_ORIGIN &&
      /^\/assets\/hanrei\/.+\.pdf$/i.test(url.pathname) &&
      url.search === "" &&
      url.hash === ""
      ? url
      : null;
  } catch {
    return null;
  }
}

export async function parseCourtDetail(
  response: Response,
  detailUrl: URL,
  courtDetailId: string,
): Promise<CourtCaseSource> {
  const rawMetadata: Record<string, string> = {};
  const documents: CourtCaseSource["documents"] = [];
  let currentLabel = "";
  let labelBuffer = "";
  let valueBuffer = "";
  let activeLink: { label: string; url: string } | null = null;
  let bytes = 0;

  const transformed = new HTMLRewriter()
    .on("dl dt", {
      element(element) {
        labelBuffer = "";
        element.onEndTag(() => {
          currentLabel = clean(labelBuffer);
        });
      },
      text(text) {
        labelBuffer += text.text;
      },
    })
    .on("dl dd", {
      element(element) {
        valueBuffer = "";
        element.onEndTag(() => {
          const value = clean(valueBuffer);
          if (currentLabel) {
            rawMetadata[currentLabel] = rawMetadata[currentLabel]
              ? `${rawMetadata[currentLabel]}\n${value}`
              : value;
          }
          currentLabel = "";
        });
      },
      text(text) {
        valueBuffer += text.text;
      },
    })
    .on("dl dd a", {
      element(element) {
        const url = courtAssetUrl(element.getAttribute("href"), detailUrl);
        activeLink = url ? { label: "", url: url.href } : null;
        element.onEndTag(() => {
          if (activeLink) {
            const label = clean(activeLink.label) || currentLabel;
            documents.push({
              role:
                currentLabel === "全文"
                  ? "full_text"
                  : currentLabel.includes("要旨")
                    ? "summary"
                    : "other",
              label,
              url: activeLink.url,
            });
          }
          activeLink = null;
        });
      },
      text(text) {
        if (activeLink) activeLink.label += text.text;
      },
    })
    .transform(response);

  if (!transformed.body) throw new CourtDetailFormatError("The court detail response has no body");
  await transformed.body.pipeTo(
    new WritableStream({
      write(chunk: Uint8Array) {
        bytes += chunk.byteLength;
        if (bytes > MAX_HTML_BYTES) {
          throw new CourtDetailFormatError("The court detail response is too large");
        }
      },
    }),
  );

  const data = {
    provider: "courts_go_jp" as const,
    courtDetailId,
    detailUrl: detailUrl.href,
    caseNumber: optional(rawMetadata, "事件番号") ?? "",
    caseName: optional(rawMetadata, "事件名"),
    decisionDate: optional(rawMetadata, "裁判年月日"),
    courtName: optional(rawMetadata, "法廷名"),
    judgmentType: optional(rawMetadata, "裁判種別"),
    result: optional(rawMetadata, "結果"),
    collectionCitation: optional(rawMetadata, "判例集等巻・号・頁"),
    originalCourtName: optional(rawMetadata, "原審裁判所名"),
    originalCaseNumber: optional(rawMetadata, "原審事件番号"),
    originalDecisionDate: optional(rawMetadata, "原審裁判年月日"),
    holding: optional(rawMetadata, "判示事項"),
    summary: optional(rawMetadata, "裁判要旨"),
    referencedLaws: optional(rawMetadata, "参照法条"),
    rawMetadata,
    documents,
  };

  const parsed = courtCaseSource.safeParse(data);
  if (!parsed.success || !documents.some((document) => document.role === "full_text")) {
    throw new CourtDetailFormatError("Required court detail metadata was not found");
  }
  return parsed.data;
}

export async function fetchCourtDetail(value: string): Promise<CourtCaseSource> {
  const { url, courtDetailId } = validateCourtDetailUrl(value);
  const response = await fetch(url, {
    headers: { Accept: "text/html" },
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) {
    throw new Error(`The court detail returned HTTP ${response.status}`);
  }
  return parseCourtDetail(response, url, courtDetailId);
}
