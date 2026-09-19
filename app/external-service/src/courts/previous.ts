import { previousJudgmentResponse } from "@recourt/types/courts";

import { fetchCourtDetail } from "./detail";
import { parseCourtSearchResults } from "./search-results";
import { buildCourtSearchUrl } from "./search-url";

const normalizeCaseNumber = (value: string) =>
  value
    .normalize("NFKC")
    .replace(/[\s　]/g, "")
    .replace(/[（）]/g, (character) => (character === "（" ? "(" : ")"));

function parseCaseNumber(value: string) {
  const normalized = normalizeCaseNumber(value);
  const match = normalized.match(/^(昭和|平成|令和)(元|\d+)年?\(([^)]+)\)第?(\d+)号?$/);
  if (!match) return null;
  return {
    normalized,
    era: match[1],
    year: match[2] === "元" ? "1" : match[2],
    type: match[3],
    number: match[4],
  };
}

async function resolveCaseCode(type: string): Promise<string | null> {
  const formUrl = new URL("https://www.courts.go.jp/hanrei/search1/index.html");
  const response = await fetch(formUrl, {
    headers: { Accept: "text/html" },
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) {
    throw new Error(`The court search form returned HTTP ${response.status}`);
  }

  let option: { value: string; label: string } | null = null;
  let result: string | null = null;
  let bytes = 0;
  const transformed = new HTMLRewriter()
    .on('select[name="filter[jikenCode]"] option', {
      element(element) {
        const value = element.getAttribute("value");
        option = value ? { value, label: "" } : null;
        element.onEndTag(() => {
          if (option && option.label.normalize("NFKC").replace(/[()（）\s　]/g, "") === type) {
            result = option.value;
          }
          option = null;
        });
      },
      text(text) {
        if (option) option.label += text.text;
      },
    })
    .transform(response);
  if (!transformed.body) throw new Error("The court search form has no body");
  await transformed.body.pipeTo(
    new WritableStream({
      write(chunk: Uint8Array) {
        bytes += chunk.byteLength;
        if (bytes > 2 * 1024 * 1024) throw new Error("The court search form is too large");
      },
    }),
  );
  return result;
}

export async function findPreviousJudgment(caseNumber: string) {
  const parsedCaseNumber = parseCaseNumber(caseNumber);
  if (!parsedCaseNumber) {
    return previousJudgmentResponse.parse({ found: false, judgment: null });
  }
  const code = await resolveCaseCode(parsedCaseNumber.type);
  if (!code) return previousJudgmentResponse.parse({ found: false, judgment: null });
  const searchUrl = buildCourtSearchUrl(1, {
    "filter[jikenGengo]": parsedCaseNumber.era,
    "filter[jikenYear]": parsedCaseNumber.year,
    "filter[jikenCode]": code,
    "filter[jikenNumber]": parsedCaseNumber.number,
  });
  const response = await fetch(searchUrl, {
    headers: { Accept: "text/html" },
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) {
    throw new Error(`The court search returned HTTP ${response.status}`);
  }
  const results = await parseCourtSearchResults(response, searchUrl);
  const expected = parsedCaseNumber.normalized;

  for (const candidate of results.results.slice(0, 10)) {
    const judgment = await fetchCourtDetail(candidate.detailUrl);
    if (normalizeCaseNumber(judgment.caseNumber) === expected) {
      return previousJudgmentResponse.parse({ found: true, judgment });
    }
  }
  return previousJudgmentResponse.parse({ found: false, judgment: null });
}
