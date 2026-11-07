import { edition20261106 } from "./editions/2026-11-06";

// Keep published editions available: a shared URL must continue to identify the same material.
export const reviewEditions = [edition20261106];
export const reviewCatalog = edition20261106;

export function getReviewCatalog(version = reviewCatalog.version) {
  return reviewEditions.find((catalog) => catalog.version === version);
}

export const opinionLabels = {
  majority: "法廷意見に賛同",
  concurring: "補足意見",
  opinion: "意見（結論に賛同）",
  dissenting: "反対意見",
} as const;

export function getReviewJudge(id: string, version = reviewCatalog.version) {
  return getReviewCatalog(version)?.judges.find((judge) => judge.id === id);
}

export function getJudgeCases(id: string, version = reviewCatalog.version) {
  return (
    getReviewCatalog(version)?.cases.filter((courtCase) =>
      courtCase.opinions.some((opinion) => opinion.judgeId === id),
    ) ?? []
  );
}
