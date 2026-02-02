import { createFileRoute } from "@tanstack/react-router";

import { getJudgeDetail } from "../../server/judges.functions";

export const Route = createFileRoute("/judges/$judgeId")({
  loader: ({ params }) => getJudgeDetail({ data: { judgeId: params.judgeId } }),
  component: JudgeDetail,
});

function JudgeDetail() {
  type JudgeDetailData = Awaited<ReturnType<typeof getJudgeDetail>>;
  const data = Route.useLoaderData() as JudgeDetailData;

  if (!data) {
    return (
      <div className="min-h-screen text-[var(--ink-1)] scv-page">
        <div className="scv-container py-12">
          <div className="scv-panel p-6 text-center text-[var(--ink-3)]">
            裁判官が見つかりません。
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[var(--ink-1)] scv-page">
      <div className="scv-container py-12">
        <div className="space-y-8">
          <div className="space-y-3">
            <p className="scv-kicker">Judge</p>
            <h1 className="scv-title">{data.judge.judge_name}</h1>
            <p className="text-[var(--ink-3)]">最高裁判例における関与記録を整理します。</p>
          </div>

          <section className="scv-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">関与事件</h2>
              <span className="text-xs text-[var(--ink-3)]">全 {data.cases.length} 件</span>
            </div>
            {data.cases.length === 0 && (
              <p className="text-sm text-[var(--ink-3)]">関与事件がありません。</p>
            )}
            <div className="space-y-4">
              {data.cases.map((caseRow: (typeof data.cases)[number], index: number) => (
                <div
                  key={caseRow.case_id}
                  className="scv-panel p-4 text-sm text-[var(--ink-2)] scv-rise"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <a className="scv-link" href={`/cases/${caseRow.case_id}`}>
                    {caseRow.case_title}
                  </a>
                  <div className="mt-2 text-xs text-[var(--ink-3)]">
                    {caseRow.decision_date} · {caseRow.court_name ?? "-"} ·
                    {caseRow.result ?? "結果未登録"}
                  </div>
                  {caseRow.supplementary_opinion && (
                    <div className="mt-2 text-[var(--ink-3)]">{caseRow.supplementary_opinion}</div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
