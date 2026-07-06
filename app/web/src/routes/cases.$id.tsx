import { createFileRoute, notFound } from "@tanstack/react-router";
import { LucideGavel } from "lucide-react";
import AffectedParties from "../components/judges/AffectedParties";
import CaseMetadata from "../components/judges/CaseMetadata";
import CaseSection from "../components/judges/CaseSection";
import CaseSummary from "../components/judges/CaseSummary";
import JudgeList from "../components/judges/JudgeList";
import { getJudgeCase } from "../data/judges";
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
            <MarkdownRenderer inline>{judgeCase.title.markdown}</MarkdownRenderer>
          </h1>

          <div>
            <CaseSummary summary={judgeCase.summary} />
          </div>

          <SectionBlock title="経緯">
            {judgeCase.background.map((paragraph, index) => (
              <MarkdownRenderer key={index}>{paragraph}</MarkdownRenderer>
            ))}
          </SectionBlock>

          <SectionBlock title="争点">
            <ul className="space-y-[14px]">
              {judgeCase.issues.map((issue, index) => (
                <li key={index} className="flex items-start gap-[14px]">
                  <LucideGavel
                    className="mt-1 h-4 w-4 shrink-0 text-neutral-900"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  <MarkdownRenderer paragraphClassName="m-0 flex-1 text-[16px] leading-[1.6] tracking-[0.02em] text-neutral-900">
                    {issue}
                  </MarkdownRenderer>
                </li>
              ))}
            </ul>
          </SectionBlock>

          <div className="relative space-y-[18px]">
            {judgeCase.reasons.map((section, index) => (
              <CaseSection
                key={`${section.heading}-${index}`}
                section={section}
                showTitle={index === 0}
              />
            ))}
          </div>

          <SectionBlock title="影響">
            <MarkdownRenderer>{judgeCase.impact}</MarkdownRenderer>
          </SectionBlock>

          <AffectedParties parties={judgeCase.affectedParties} />

          <CaseSummary summary={judgeCase.summary} />
        </article>

        <aside className="space-y-[18px] lg:pt-0">
          <CaseMetadata judgeCase={judgeCase} />
          <JudgeList judges={judgeCase.judges} />
        </aside>
      </div>
    </main>
  );
}

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-[18px]">
      <h2 className="text-[11px] font-medium whitespace-nowrap text-neutral-600">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
