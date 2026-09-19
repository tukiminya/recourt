import { wikipediaSearchResponse } from "@recourt/types/courts";
import { z } from "zod";

const mediaWikiResponse = z.object({
  query: z.object({
    search: z.array(z.object({ title: z.string(), snippet: z.string() })),
  }),
});

function plainText(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replace(/\s+/g, " ")
    .trim();
}

export async function searchWikipedia(query: string, limit: number) {
  const url = new URL("https://ja.wikipedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: String(limit),
    format: "json",
    formatversion: "2",
  }).toString();
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "recourt/1.0" },
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Wikipedia returned HTTP ${response.status}`);
  const parsed = mediaWikiResponse.parse(await response.json());
  return wikipediaSearchResponse.parse({
    results: parsed.query.search.map((result) => ({
      title: result.title,
      snippet: plainText(result.snippet),
      url: `https://ja.wikipedia.org/wiki/${encodeURIComponent(result.title.replaceAll(" ", "_"))}`,
    })),
  });
}
