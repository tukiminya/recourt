const COURTS_ORIGIN = "https://www.courts.go.jp";

export type CourtSearchResult = {
  id: string;
  label: string;
  detailUrl: string;
  lines: string[];
  pdfs: { label: string; url: string }[];
};

export type CourtSearchResults = {
  total: number;
  offset: number;
  nextOffset: number | null;
  results: CourtSearchResult[];
};

export class UpstreamResultLimitError extends Error {}
export class UpstreamFormatError extends Error {}

function courtUrl(href: string | null, base: URL): URL | null {
  if (!href) return null;
  try {
    const url = new URL(href, base);
    return url.origin === COURTS_ORIGIN ? url : null;
  } catch {
    return null;
  }
}

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export async function parseCourtSearchResults(
  response: Response,
  searchUrl: URL,
): Promise<CourtSearchResults> {
  const results: CourtSearchResult[] = [];
  let row: CourtSearchResult | null = null;
  let total: number | null = null;
  let summary = "";
  let zeroResults = false;
  let zeroMessage = "";
  let recentText = "";
  let overLimit = false;
  let paragraph = "";
  let pdf: { label: string; url: string } | null = null;
  let bytes = 0;

  const transformed = new HTMLRewriter()
    .on("#searched .paging-parts2 p", {
      text(text) {
        if (total === null) summary += text.text;
      },
    })
    .on("p#searched", {
      text(text) {
        zeroMessage += text.text;
      },
    })
    .on("table.search-result-table tr", {
      element(element) {
        row = { id: "", label: "", detailUrl: "", lines: [], pdfs: [] };
        element.onEndTag(() => {
          if (row?.id && row.detailUrl) results.push(row);
          row = null;
        });
      },
    })
    .on("table.search-result-table tr th a", {
      element(element) {
        const url = courtUrl(element.getAttribute("href"), searchUrl);
        const match = url?.pathname.match(/^\/hanrei\/(\d+)\/detail\d+\/index\.html$/);
        if (row && url && match) {
          row.id = match[1];
          row.detailUrl = url.href;
        }
      },
      text(text) {
        if (row) row.label += text.text;
      },
    })
    .on("table.search-result-table tr td:not(.file-col) p", {
      element(element) {
        paragraph = "";
        element.onEndTag(() => {
          const line = clean(paragraph);
          if (row && line) row.lines.push(line);
          paragraph = "";
        });
      },
      text(text) {
        paragraph += text.text;
      },
    })
    .on("table.search-result-table tr td.file-col a", {
      element(element) {
        const url = courtUrl(element.getAttribute("href"), searchUrl);
        pdf =
          url?.pathname.startsWith("/assets/hanrei/") && url.pathname.endsWith(".pdf")
            ? { label: "", url: url.href }
            : null;
        element.onEndTag(() => {
          if (row && pdf) row.pdfs.push({ ...pdf, label: clean(pdf.label) });
          pdf = null;
        });
      },
      text(text) {
        if (pdf) pdf.label += text.text;
      },
    })
    .onDocument({
      text(text) {
        recentText = (recentText + text.text).slice(-300);
        if (recentText.includes("検索結果が2000件を超えました。")) overLimit = true;
      },
    })
    .transform(response);

  if (!transformed.body) throw new UpstreamFormatError("The court search response has no body");
  await transformed.body.pipeTo(
    new WritableStream({
      write(chunk: Uint8Array) {
        bytes += chunk.byteLength;
        if (bytes > 5 * 1024 * 1024)
          throw new UpstreamFormatError("The court search response is too large");
      },
    }),
  );

  if (overLimit) {
    throw new UpstreamResultLimitError(
      "The court search returned more than 2000 results; narrow the search conditions",
    );
  }
  zeroResults = clean(zeroMessage).includes("該当する裁判例がありませんでした。");

  const match = clean(summary).match(/([\d,]+)件中\s*[\d,]+\s*[～〜]\s*[\d,]+件を表示/);
  if (match) total = Number(match[1].replaceAll(",", ""));
  if (total === null && !zeroResults) {
    throw new UpstreamFormatError("The court search result format was not recognized");
  }
  if (total === null) total = 0;
  if (total > 0 && results.length === 0) {
    throw new UpstreamFormatError("The court search result rows were not recognized");
  }

  for (const result of results) result.label = clean(result.label);
  const offset = Number(searchUrl.searchParams.get("offset") ?? 0);
  return {
    total,
    offset,
    nextOffset: offset + results.length < total ? offset + 30 : null,
    results,
  };
}
