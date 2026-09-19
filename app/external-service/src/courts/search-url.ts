export type SearchPage = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type SearchQueryParams = Record<string, string | string[] | undefined> & {
  view?: "main" | "chizai";
};

export class InvalidSearchRequest extends Error {}

export function buildCourtSearchUrl(page: SearchPage, query: SearchQueryParams): URL {
  const url = new URL(`https://www.courts.go.jp/hanrei/search${page}/index.html`);
  const view = query.view ?? "main";

  if (page !== 1) {
    url.searchParams.set(
      "courtCaseType",
      page === 7 ? (view === "main" ? "6 7" : "7") : String(page - 1),
    );
  }
  if (page === 7) url.searchParams.set("view", view);

  for (const [key, value] of Object.entries(query)) {
    if (key === "view" || value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      url.searchParams.append(key, item);
    }
  }

  if (url.href.length > 4096) throw new InvalidSearchRequest("Search URL is too large");
  return url;
}
