import { createFileRoute, notFound } from "@tanstack/react-router";
import { getJudgeCase } from "../data/judges";
import CaseArticleView from "../features/cases/CaseArticleView";

export const Route = createFileRoute("/cases/$id")({
  loader: ({ params }) => {
    const judgeCase = getJudgeCase(params.id);

    if (!judgeCase) {
      throw notFound();
    }

    return { judgeCase };
  },
  component: JudgeCasePage,
});

function JudgeCasePage() {
  const { judgeCase } = Route.useLoaderData();

  return (
    <main className="px-5 pt-[67px]">
      <CaseArticleView article={judgeCase} />
    </main>
  );
}
