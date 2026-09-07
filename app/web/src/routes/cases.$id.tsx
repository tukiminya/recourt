import { createFileRoute, notFound } from "@tanstack/react-router";
import CaseMetadata from "../components/judges/CaseMetadata";
import CaseSection from "../components/judges/CaseSection";
import CaseSummary from "../components/judges/CaseSummary";
import JudgeList from "../components/judges/JudgeList";
import { getCaseEntity, getJudgeCase, getJudgeEntities, richTextToMarkdown } from "../data/judges";
import { MarkdownRenderer } from "../integrations/markdown/markdown";

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
      <div className="mx-auto grid max-w-[992px] grid-cols-1 gap-y-12 lg:grid-cols-[552px_388px] lg:gap-x-[52px]">
        <article className="relative space-y-16">
          <h1 className="text-[32px] leading-[1.4] font-medium text-neutral-900">
            <MarkdownRenderer inline>
              {richTextToMarkdown(judgeCase.title, judgeCase.entities)}
            </MarkdownRenderer>
          </h1>

          <div>
            <CaseSummary summary={judgeCase.summary.items} entities={judgeCase.entities} />
          </div>

          <div className="space-y-16">
            {judgeCase.sections.map((section) => (
              <CaseSection key={section.key} section={section} entities={judgeCase.entities} />
            ))}
          </div>

          <CaseSummary summary={judgeCase.summary.items} entities={judgeCase.entities} />
        </article>

        <aside className="space-y-[18px] lg:pt-0">
          <CaseMetadata caseEntity={getCaseEntity(judgeCase)} />
          <JudgeList judges={getJudgeEntities(judgeCase)} />
        </aside>
      </div>
    </main>
  );
}
