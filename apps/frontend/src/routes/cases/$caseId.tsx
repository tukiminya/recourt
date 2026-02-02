import { createFileRoute } from "@tanstack/react-router";
import { SquareArrowOutUpRight } from "lucide-react";

import { getCaseDetail } from "../../server/cases.functions";

export const Route = createFileRoute("/cases/$caseId")({
  loader: ({ params }) => getCaseDetail({ data: { caseId: params.caseId } }),
  component: CaseDetail,
});

function CaseDetail() {
  type CaseDetailData = Awaited<ReturnType<typeof getCaseDetail>>;
  const data = Route.useLoaderData() as CaseDetailData;

  const parseStringArray = (value: string | null | undefined) => {
    if (!value) {
      return [] as string[];
    }
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) {
        return [] as string[];
      }
      return parsed.filter((item) => typeof item === "string");
    } catch {
      return [] as string[];
    }
  };

  const parseGlossary = (value: string | null | undefined) => {
    if (!value) {
      return [] as { term: string; explanation: string }[];
    }
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) {
        return [] as { term: string; explanation: string }[];
      }
      return parsed.filter(
        (item) =>
          item &&
          typeof item === "object" &&
          typeof item.term === "string" &&
          typeof item.explanation === "string",
      );
    } catch {
      return [] as { term: string; explanation: string }[];
    }
  };

  if (!data) {
    return (
      <div className="min-h-screen text-[var(--ink-1)] scv-page">
        <div className="scv-container py-12">
          <div className="scv-panel p-6 text-center text-[var(--ink-3)]">
            事件が見つかりません。
          </div>
        </div>
      </div>
    );
  }

  const { case: caseRow, outcome, explanation, judges } = data;
  const issues = parseStringArray(explanation?.issues_json);
  const reasoning = parseStringArray(explanation?.reasoning_json);
  const impactedParties = parseStringArray(explanation?.impacted_parties_json);
  const glossary = parseGlossary(explanation?.glossary_json);
  const displayTitle = caseRow.case_title_short ?? caseRow.case_title;

  return (
    <div className="min-h-screen text-[var(--ink-1)] scv-page">
      <div className="scv-container py-12">
        <div className="grid gap-10 lg:grid-cols-[1.6fr_0.9fr] items-start">
          <div className="space-y-8">
            <div className="space-y-3">
              <p className="scv-kicker">Case File</p>
              <h1 className="scv-title">{displayTitle}</h1>
              <p className="text-[var(--ink-3)]">{caseRow.case_title}</p>
            </div>

            <section className="scv-card p-6">
              <h2 className="text-lg font-semibold mb-4">判決結果</h2>
              <div className="space-y-3 text-sm text-[var(--ink-2)]">
                <p>
                  <span className="text-[var(--ink-3)]">種別:</span>{" "}
                  {outcome?.outcome_type ?? "-"}
                </p>
                <p>
                  <span className="text-[var(--ink-3)]">結果:</span>{" "}
                  {outcome?.result ?? "-"}
                </p>
                <p className="whitespace-pre-line">
                  <span className="text-[var(--ink-3)]">主文:</span>
                  <br />
                  {outcome?.main_text ?? "-"}
                </p>
              </div>
            </section>

            <section className="scv-card p-6">
              <h2 className="text-lg font-semibold mb-4">AIによる事件の整理</h2>
              {!explanation && (
                <p className="text-sm text-[var(--ink-3)]">
                  AIによる解説がありません。
                </p>
              )}
              {explanation && (
                <div className="space-y-4 text-sm text-[var(--ink-2)]">
                  <div>
                    <p className="text-[var(--ink-3)]">概要</p>
                    <p className="mt-1 whitespace-pre-line">
                      {explanation.summary}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--ink-3)]">背景</p>
                    <p className="mt-1 whitespace-pre-line">
                      {explanation.background}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--ink-3)]">争点</p>
                    {issues.length === 0 ? (
                      <p className="mt-1">-</p>
                    ) : (
                      <ul className="mt-1 list-disc pl-5 space-y-1">
                        {issues.map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="text-[var(--ink-3)]">判断理由の要点</p>
                    {reasoning.length === 0 ? (
                      <p className="mt-1">-</p>
                    ) : (
                      <ul className="mt-1 list-disc pl-5 space-y-1">
                        {reasoning.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="text-[var(--ink-3)]">影響</p>
                    <p className="mt-1 whitespace-pre-line">
                      {explanation.impact}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--ink-3)]">影響を受ける主体</p>
                    {impactedParties.length === 0 ? (
                      <p className="mt-1">-</p>
                    ) : (
                      <ul className="mt-1 list-disc pl-5 space-y-1">
                        {impactedParties.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="text-[var(--ink-3)]">
                      この裁判で明確になったこと
                    </p>
                    <p className="mt-1 whitespace-pre-line">
                      {explanation.what_we_learned}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--ink-3)]">用語解説</p>
                    {glossary.length === 0 ? (
                      <p className="mt-1">-</p>
                    ) : (
                      <dl className="mt-1 space-y-2">
                        {glossary.map((item) => (
                          <div key={item.term}>
                            <dt className="text-[var(--ink-2)] font-medium">
                              {item.term}
                            </dt>
                            <dd className="text-[var(--ink-3)]">
                              {item.explanation}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="scv-panel p-5">
              <h2 className="text-base font-semibold">事件情報</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-[var(--ink-3)]">事件番号</dt>
                  <dd className="text-[var(--ink-1)]">
                    {caseRow.court_incident_id}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-[var(--ink-3)]">判決日</dt>
                  <dd className="text-[var(--ink-1)]">
                    {caseRow.decision_date}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-[var(--ink-3)]">法廷</dt>
                  <dd className="text-[var(--ink-1)]">
                    {caseRow.court_name ?? "-"}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-[var(--ink-3)]">結果</dt>
                  <dd className="text-[var(--ink-1)]">
                    {outcome?.result ?? "-"}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="scv-card p-5">
              <h2 className="text-base font-semibold mb-4">裁判官</h2>
              <div className="space-y-4">
                {judges.length === 0 && (
                  <p className="text-sm text-[var(--ink-3)]">
                    裁判官情報がありません。
                  </p>
                )}
                {judges.map((judge: (typeof judges)[number], index: number) => (
                  <div
                    key={judge.judge_id}
                    className="text-sm text-[var(--ink-2)] scv-rise"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <a className="scv-link" href={`/judges/${judge.judge_id}`}>
                      {judge.judge_name}
                    </a>
                    {judge.supplementary_opinion && (
                      <div className="mt-2 space-y-2">
                        <p className="text-[var(--ink-3)]">
                          {judge.supplementary_opinion}
                        </p>
                        {judge.opinion_summary && (
                          <div className="scv-panel px-3 py-2 text-[var(--ink-3)]">
                            <p className="text-xs text-[var(--ink-3)]">
                              原文の範囲内での短い要約です。
                            </p>
                            <p className="mt-1">{judge.opinion_summary}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="scv-card p-5">
              <h2 className="text-base font-semibold mb-4">関連リンク</h2>
              <div className="flex flex-col gap-4 text-sm">
                {caseRow.detail_url ? (
                  <a
                    className="scv-link inline-flex items-center gap-2"
                    href={caseRow.detail_url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    裁判所の判例ページ
                    <SquareArrowOutUpRight className="h-4 w-4" />
                  </a>
                ) : (
                  <p className="text-[var(--ink-3)]">裁判所の判例ページ: -</p>
                )}
                {caseRow.pdf_url ? (
                  <a
                    className="scv-link inline-flex items-center gap-2"
                    href={caseRow.pdf_url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    判例の全文
                    <SquareArrowOutUpRight className="h-4 w-4" />
                  </a>
                ) : (
                  <p className="text-[var(--ink-3)]">判例の全文: -</p>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
