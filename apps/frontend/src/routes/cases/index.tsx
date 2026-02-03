import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import SearchField from "../../components/SearchField";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { listCases, listIncidentCategories } from "../../server/cases.functions";

const searchSchema = z.object({
  era: z.string().optional(),
  year: z.string().optional(),
  code: z.string().optional(),
  number: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  sort: z.enum(["desc", "asc"]).optional().default("desc"),
});

const buildIncidentId = (search: z.infer<typeof searchSchema>) => {
  if (!search.era || !search.year || !search.code || !search.number) {
    return undefined;
  }
  return `${search.era}${search.year}年(${search.code})${search.number}`;
};

export const Route = createFileRoute("/cases/")({
  validateSearch: (search) => searchSchema.parse(search),
  loader: (ctx) => {
    const search = searchSchema.parse((ctx as { search?: unknown }).search ?? {});
    return Promise.all([
      listCases({
        data: {
          incidentId: buildIncidentId(search),
          from: search.from,
          to: search.to,
          sort: search.sort,
        },
      }),
      listIncidentCategories(),
    ]).then(([cases, categories]) => ({ cases, categories }));
  },
  component: CasesIndex,
});

function CasesIndex() {
  type CaseListItem = Awaited<ReturnType<typeof listCases>>[number];
  type IncidentCategory = Awaited<ReturnType<typeof listIncidentCategories>>[number];
  const { cases, categories } = Route.useLoaderData() as {
    cases: CaseListItem[];
    categories: IncidentCategory[];
  };
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [era, setEra] = useState<string | undefined>(search.era);
  const [year, setYear] = useState(search.year ?? "");
  const [code, setCode] = useState<string | undefined>(search.code);
  const [number, setNumber] = useState(search.number ?? "");
  const [from, setFrom] = useState(search.from ?? "");
  const [to, setTo] = useState(search.to ?? "");
  const [sort, setSort] = useState<"desc" | "asc">(search.sort ?? "desc");
  const [formError, setFormError] = useState<string | null>(null);
  const emptySelectValue = "none";

  return (
    <div className="min-h-screen text-[var(--ink-1)] scv-page">
      <div className="scv-container py-12">
        <div className="space-y-10">
          <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] items-start">
            <div className="space-y-4">
              <p className="scv-kicker">Supreme Court Digest</p>
              <h1 className="scv-title">判例一覧</h1>
              <p className="scv-lead">事件番号（分割入力）と判決日で最高裁判例を検索できます。</p>
              <div className="flex flex-wrap gap-2">
                <span className="scv-chip">事件番号で検索</span>
                <span className="scv-chip">判決日で絞り込み</span>
                <span className="scv-chip">新旧順を切替</span>
              </div>
            </div>
            <div className="scv-panel p-5">
              <p className="text-sm text-[var(--ink-2)] leading-relaxed">
                事件番号は「元号 + 年 + 符号 + 番号」を分割して入力します。
                判決日は日付範囲を指定できます。
              </p>
              <div className="mt-5 grid gap-3 text-xs text-[var(--ink-3)]">
                <div className="flex items-center justify-between border-b border-[var(--border-1)] pb-2">
                  <span>検索対象</span>
                  <span className="text-[var(--ink-2)]">最高裁判例</span>
                </div>
                <div className="flex items-center justify-between border-b border-[var(--border-1)] pb-2">
                  <span>更新頻度</span>
                  <span className="text-[var(--ink-2)]">随時</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>並び替え</span>
                  <span className="text-[var(--ink-2)]">判決日</span>
                </div>
              </div>
            </div>
          </section>

          <form
            className="scv-card grid gap-4 p-6 md:grid-cols-12"
            onSubmit={(event) => {
              event.preventDefault();
              const hasCodeOnly = Boolean(code) && !era && !year && !number && !from && !to;
              if (hasCodeOnly) {
                setFormError(
                  "符号だけでは検索できません。元号と年、判決日、または番号を入力してください。",
                );
                return;
              }
              setFormError(null);
              const next = searchSchema.parse({
                era: era || undefined,
                year: year || undefined,
                code: code || undefined,
                number: number || undefined,
                from: from || undefined,
                to: to || undefined,
                sort,
              });
              navigate({ search: () => next });
            }}
          >
            <div className="md:col-span-12 grid gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[var(--ink-2)]">事件番号で検索する</p>
                <span className="text-xs text-[var(--ink-3)]">元号 + 年の入力が必須です</span>
              </div>
              <div className="grid gap-4 md:grid-cols-12">
                <div className="md:col-span-2">
                  <SearchField label="元号" htmlFor="incident-era">
                    <Select
                      value={era ?? emptySelectValue}
                      onValueChange={(value) =>
                        setEra(value === emptySelectValue ? undefined : value)
                      }
                    >
                      <SelectTrigger id="incident-era" className="scv-select h-10 w-full">
                        <SelectValue placeholder="選択" />
                      </SelectTrigger>
                      <SelectContent
                        className="bg-[var(--paper-1)] text-[var(--ink-1)] border-[var(--border-1)]"
                        side="bottom"
                        position="popper"
                      >
                        <SelectItem value={emptySelectValue}>指定なし</SelectItem>
                        <SelectItem value="令和">令和</SelectItem>
                        <SelectItem value="平成">平成</SelectItem>
                        <SelectItem value="昭和">昭和</SelectItem>
                      </SelectContent>
                    </Select>
                  </SearchField>
                </div>
                <div className="md:col-span-2">
                  <SearchField label="年" htmlFor="incident-year">
                    <Input
                      id="incident-year"
                      name="year"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={year}
                      placeholder="例: 5"
                      className="scv-input h-10"
                      onChange={(event) => setYear(event.target.value)}
                    />
                  </SearchField>
                </div>
                <div className="md:col-span-3">
                  <SearchField label="符号" htmlFor="incident-code">
                    <Select
                      value={code ?? emptySelectValue}
                      onValueChange={(value) =>
                        setCode(value === emptySelectValue ? undefined : value)
                      }
                    >
                      <SelectTrigger id="incident-code" className="scv-select h-10 w-full">
                        <SelectValue placeholder="選択" />
                      </SelectTrigger>
                      <SelectContent
                        className="bg-[var(--paper-1)] text-[var(--ink-1)] border-[var(--border-1)] max-h-72"
                        side="bottom"
                        position="popper"
                      >
                        <div className="p-1">
                          <SelectItem value={emptySelectValue}>指定なし</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.code} value={category.code}>
                              {category.code} {category.label}
                            </SelectItem>
                          ))}
                        </div>
                      </SelectContent>
                    </Select>
                  </SearchField>
                </div>
                <div className="md:col-span-3">
                  <SearchField label="事件番号" htmlFor="incident-number">
                    <Input
                      id="incident-number"
                      name="number"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={number}
                      placeholder="例: 1234"
                      className="scv-input h-10"
                      onChange={(event) => setNumber(event.target.value)}
                    />
                  </SearchField>
                </div>
              </div>
              {formError && <p className="text-xs text-[var(--accent-1)]">{formError}</p>}
            </div>
            <div className="md:col-span-12 grid gap-3">
              <p className="text-sm font-semibold text-[var(--ink-2)]">裁判日で検索する</p>
              <div className="grid gap-4 md:grid-cols-12">
                <div className="md:col-span-3">
                  <SearchField label="判決日（開始）" htmlFor="decision-from">
                    <Input
                      id="decision-from"
                      name="from"
                      type="date"
                      value={from}
                      className="scv-input h-10"
                      onChange={(event) => setFrom(event.target.value)}
                    />
                  </SearchField>
                </div>
                <div className="md:col-span-3">
                  <SearchField label="判決日（終了）" htmlFor="decision-to">
                    <Input
                      id="decision-to"
                      name="to"
                      type="date"
                      value={to}
                      className="scv-input h-10"
                      onChange={(event) => setTo(event.target.value)}
                    />
                  </SearchField>
                </div>
                <div className="md:col-span-3">
                  <SearchField label="並び順" htmlFor="decision-sort">
                    <Select
                      value={sort}
                      onValueChange={(value) => setSort(value === "asc" ? "asc" : "desc")}
                    >
                      <SelectTrigger id="decision-sort" className="scv-select h-10 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent
                        className="bg-[var(--paper-1)] text-[var(--ink-1)] border-[var(--border-1)]"
                        side="bottom"
                        position="popper"
                      >
                        <SelectItem value="desc">判決日 (新しい順)</SelectItem>
                        <SelectItem value="asc">判決日 (古い順)</SelectItem>
                      </SelectContent>
                    </Select>
                  </SearchField>
                </div>
              </div>
            </div>
            <div className="md:col-span-12">
              <SearchField label="検索" labelAs="span">
                <Button type="submit" className="scv-button h-10 w-full" size="lg">
                  検索
                </Button>
              </SearchField>
            </div>
          </form>

          <section className="space-y-4">
            {cases.length === 0 ? (
              <div className="scv-panel p-6 text-center text-[var(--ink-3)]">
                該当する判例がありません。
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">検索結果</h2>
                  <p className="text-xs text-[var(--ink-3)]">全 {cases.length} 件</p>
                </div>

                <div className="md:hidden space-y-4">
                  {cases.map((caseItem: CaseListItem, index: number) => (
                    <div
                      key={caseItem.case_id}
                      className="scv-card p-4 scv-rise"
                      style={{ animationDelay: `${index * 45}ms` }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <a className="scv-link" href={`/cases/${caseItem.case_id}`}>
                            {caseItem.case_title_short ?? caseItem.case_title}
                          </a>
                          {caseItem.case_title_short && (
                            <p className="mt-1 text-xs text-[var(--ink-3)]">
                              {caseItem.case_title}
                            </p>
                          )}
                        </div>
                        <span className="scv-chip">{caseItem.decision_date}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--ink-3)]">
                        <span>{caseItem.court_name ?? "-"}</span>
                        <span>{caseItem.court_incident_id}</span>
                        <span>{caseItem.result ?? "-"}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden md:block overflow-hidden scv-card">
                  <table className="scv-table w-full text-left text-sm">
                    <thead className="bg-[var(--paper-2)] text-[var(--ink-2)]">
                      <tr>
                        <th className="px-4 py-3">事件名</th>
                        <th className="px-4 py-3">判決日</th>
                        <th className="px-4 py-3">法廷</th>
                        <th className="px-4 py-3">事件番号</th>
                        <th className="px-4 py-3">結果</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-1)]">
                      {cases.map((caseItem: CaseListItem, index: number) => (
                        <tr
                          key={caseItem.case_id}
                          className="hover:bg-[color:rgba(215,199,180,0.3)] scv-rise"
                          style={{ animationDelay: `${index * 35}ms` }}
                        >
                          <td className="px-4 py-3">
                            <a className="scv-link" href={`/cases/${caseItem.case_id}`}>
                              {caseItem.case_title_short ?? caseItem.case_title}
                            </a>
                            {caseItem.case_title_short && (
                              <p className="mt-1 text-xs text-[var(--ink-3)]">
                                {caseItem.case_title}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-[var(--ink-2)] min-w-fit">
                            {caseItem.decision_date}
                          </td>
                          <td className="px-4 py-3 text-[var(--ink-3)] min-w-fit">
                            {caseItem.court_name ?? "-"}
                          </td>
                          <td className="px-4 py-3 text-[var(--ink-3)] min-w-fit">
                            {caseItem.court_incident_id}
                          </td>
                          <td className="px-4 py-3 text-[var(--ink-2)] min-w-fit">
                            {caseItem.result ?? "-"}
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
