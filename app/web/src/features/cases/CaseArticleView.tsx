import CaseMetadata from "../../components/judges/CaseMetadata";
import CaseSection from "../../components/judges/CaseSection";
import CaseSummary from "../../components/judges/CaseSummary";
import JudgeList from "../../components/judges/JudgeList";
import {
  getCaseEntity,
  getJudgeEntities,
  richTextToMarkdown,
  type JudgeCase,
} from "../../data/judges";
import { MarkdownRenderer } from "../../integrations/markdown/markdown";

type CaseEntity = Extract<JudgeCase["entities"][string], { type: "case" }>;
type JudgeEntity = Extract<JudgeCase["entities"][string], { type: "person" }>;

type CaseArticleViewProps = {
  article: JudgeCase;
  mockMetadata?: boolean;
};

const mockCaseEntity: CaseEntity = {
  type: "case",
  title: "プレビュー用事件",
  case_number: "令和8年（テ）第1号",
  court: "プレビュー用裁判所",
  decision_date: "2026-01-01",
  summary: null,
  url: null,
};

const mockJudges: JudgeEntity[] = [
  {
    type: "person",
    name: "テスト裁判官",
    role: "裁判長",
    description: null,
    url: null,
  },
];

export default function CaseArticleView({ article, mockMetadata = false }: CaseArticleViewProps) {
  const caseEntity = getCaseEntity(article) ?? (mockMetadata ? mockCaseEntity : undefined);
  const judges = getJudgeEntities(article);

  return (
    <div className="mx-auto grid max-w-[992px] grid-cols-1 gap-y-12 lg:grid-cols-[552px_388px] lg:gap-x-[52px]">
      <article className="relative space-y-16">
        <h1 className="text-[32px] leading-[1.4] font-medium text-neutral-900">
          <MarkdownRenderer inline>
            {richTextToMarkdown(article.title, article.entities)}
          </MarkdownRenderer>
        </h1>

        <div>
          <CaseSummary summary={article.summary.items} entities={article.entities} />
        </div>

        <div className="space-y-16">
          {article.sections.map((section) => (
            <CaseSection key={section.key} section={section} entities={article.entities} />
          ))}
        </div>

        <CaseSummary summary={article.summary.items} entities={article.entities} />
      </article>

      <aside className="space-y-[18px] lg:pt-0">
        <CaseMetadata caseEntity={caseEntity} />
        <JudgeList judges={judges.length > 0 ? judges : mockMetadata ? mockJudges : judges} />
      </aside>
    </div>
  );
}
