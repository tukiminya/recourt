import type { CaseCourtId, CourtCaseSource } from "@recourt/types";

export class CourtCaseIdentityError extends Error {}

const eraNames = {
  昭和: "showa",
  平成: "heisei",
  令和: "reiwa",
} as const;

const normalize = (value: string) => value.normalize("NFKC").replace(/\s+/g, "").trim();

function parseCourtLabel(value: string): Pick<CaseCourtId, "court_name" | "branch_name"> {
  const normalized = normalize(value);
  const match = normalized.match(/^(.+?裁判所)(.*)$/);
  if (!match) throw new CourtCaseIdentityError("The court name could not be normalized");

  const remainder = match[2] ?? "";
  return {
    court_name: match[1],
    branch_name: remainder.match(/^(.+?支部)/)?.[1] ?? null,
  };
}

export function courtCaseIdFromSource(source: CourtCaseSource): CaseCourtId {
  if (!source.courtName) throw new CourtCaseIdentityError("The court detail has no court name");
  const number = normalize(source.caseNumber).match(
    /^(昭和|平成|令和)(元|\d+)年?\(([^)]+)\)第?(\d+)号?$/,
  );
  if (!number) throw new CourtCaseIdentityError("The court case number could not be normalized");

  return {
    ...parseCourtLabel(source.courtName),
    era: eraNames[number[1] as keyof typeof eraNames],
    year: number[2] === "元" ? 1 : Number(number[2]),
    type: number[3],
    number: Number(number[4]),
  };
}

export async function extractWorkflowId(courtCaseId: CaseCourtId, pdfUrl: string) {
  const identity = [
    courtCaseId.court_name,
    courtCaseId.branch_name ?? "",
    courtCaseId.era,
    courtCaseId.year,
    courtCaseId.type,
    courtCaseId.number,
    pdfUrl,
  ].join("|");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(identity));
  const hash = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `extract-${hash}`;
}
