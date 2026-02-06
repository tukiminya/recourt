import { createFileRoute } from "@tanstack/react-router";

import { listJudges } from "../../server/judges.functions";

export const Route = createFileRoute("/judges/")({
  loader: () => listJudges(),
  component: JudgesIndex,
});

function JudgesIndex() {
  type JudgeListItem = Awaited<ReturnType<typeof listJudges>>[number];
  const judges = Route.useLoaderData() as JudgeListItem[];

  return (
    <div className="min-h-screen text-[var(--ink-1)] scv-page">
      <div className="scv-container py-12">
        <div className="space-y-10">
          <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-start">
            <div className="space-y-4">
              <p className="scv-kicker">Judges</p>
              <h1 className="scv-title">裁判官一覧</h1>
              <p className="scv-lead">
                登録されている裁判官と、これまでの関与事件数を一覧できます。
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="scv-chip">担当事件数の多い順</span>
                <span className="scv-chip">全 {judges.length} 名</span>
              </div>
            </div>
            <div className="scv-panel p-5">
              <p className="text-sm text-[var(--ink-2)] leading-relaxed">
                判例データに紐づいた裁判官を集計しています。詳細では関与した事件の一覧を確認できます。
              </p>
              <div className="mt-5 grid gap-3 text-xs text-[var(--ink-3)]">
                <div className="flex items-center justify-between border-b border-[var(--border-1)] pb-2">
                  <span>集計対象</span>
                  <span className="text-[var(--ink-2)]">最高裁判例</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>表示順</span>
                  <span className="text-[var(--ink-2)]">関与事件数</span>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            {judges.length === 0 ? (
              <div className="scv-panel p-6 text-center text-[var(--ink-3)]">
                裁判官がまだ登録されていません。
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">登録裁判官</h2>
                  <p className="text-xs text-[var(--ink-3)]">全 {judges.length} 名</p>
                </div>

                <div className="md:hidden space-y-4">
                  {judges.map((judge: JudgeListItem, index: number) => (
                    <div
                      key={judge.judge_id}
                      className="scv-card p-4 scv-rise"
                      style={{ animationDelay: `${index * 45}ms` }}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <a className="scv-link" href={`/judges/${judge.judge_id}`}>
                          {judge.judge_name}
                        </a>
                        <span className="scv-chip">
                          {judge.case_count ?? 0} 件
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-[var(--ink-3)]">
                        関与事件数
                      </p>
                    </div>
                  ))}
                </div>

                <div className="hidden md:block overflow-hidden scv-card">
                  <table className="scv-table w-full text-left text-sm">
                    <thead className="bg-[var(--paper-2)] text-[var(--ink-2)]">
                      <tr>
                        <th className="px-4 py-3">裁判官</th>
                        <th className="px-4 py-3">関与事件数</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-1)]">
                      {judges.map((judge: JudgeListItem, index: number) => (
                        <tr
                          key={judge.judge_id}
                          className="hover:bg-[var(--table-hover)] scv-rise"
                          style={{ animationDelay: `${index * 35}ms` }}
                        >
                          <td className="px-4 py-3">
                            <a className="scv-link" href={`/judges/${judge.judge_id}`}>
                              {judge.judge_name}
                            </a>
                          </td>
                          <td className="px-4 py-3 text-[var(--ink-2)]">
                            {judge.case_count ?? 0} 件
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
