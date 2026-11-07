import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getJudgeCases, getReviewJudge, getReviewCatalog } from "@recourt/api/review-catalog";
import JudgeReadingExperience from "../features/judicial-review/JudgeReadingExperience";

export const Route = createFileRoute("/judges/$id")({
  validateSearch: (search: Record<string, unknown>): { caseId?: string; edition?: string } => ({
    edition:
      typeof search.edition === "string" && search.edition.length <= 80
        ? search.edition
        : undefined,
    caseId:
      typeof search.caseId === "string" && search.caseId.length <= 80 ? search.caseId : undefined,
  }),
  loaderDeps: ({ search }) => ({ edition: search.edition, caseId: search.caseId }),
  loader: ({ params, deps }) => {
    const catalog = getReviewCatalog(deps.edition);
    const judge = catalog && getReviewJudge(params.id, catalog.version);
    if (!judge || !catalog) throw notFound();
    if (
      deps.caseId &&
      !getJudgeCases(judge.id, catalog.version).some((courtCase) => courtCase.id === deps.caseId)
    )
      throw notFound();
    return { judge, catalog };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.judge.name}の判断をたどる - 再考裁`
          : "裁判官の資料 - 再考裁",
      },
    ],
  }),
  notFoundComponent: () => (
    <main className="px-5 py-20 text-center">
      <h1 className="text-xl font-semibold text-recourt-brandblue">
        この裁判官の公開資料は見つかりません。
      </h1>
      <Link to="/" search={{ topics: "" }} className="mt-5 inline-block text-sm underline">
        裁判官の一覧へ
      </Link>
    </main>
  ),
  component: JudgePage,
});

function JudgePage() {
  const { judge, catalog } = Route.useLoaderData();
  const { caseId } = Route.useSearch();
  const navigate = Route.useNavigate();
  const selectedCaseId = getJudgeCases(judge.id, catalog.version).some(
    (courtCase) => courtCase.id === caseId,
  )
    ? caseId
    : undefined;
  return (
    <JudgeReadingExperience
      key={`${judge.id}:${catalog.version}`}
      catalog={catalog}
      judge={judge}
      selectedCaseId={selectedCaseId}
      onSelectCase={(id) => {
        void navigate({ search: { caseId: id, edition: catalog.version }, resetScroll: false });
      }}
    />
  );
}
