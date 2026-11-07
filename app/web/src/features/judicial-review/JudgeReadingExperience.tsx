import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { LucideArrowLeft, LucideArrowUpRight, LucideLink, LucideFileText } from "lucide-react";
import { getJudgeCases, getReviewJudge, opinionLabels } from "@recourt/api/review-catalog";
import type { ReviewCase, ReviewJudge, ReviewCatalog } from "@recourt/types";
import Label from "../../components/Label";
import ReflectionWorkspace from "./ReflectionWorkspace";

export default function JudgeReadingExperience({
  catalog,
  judge,
  selectedCaseId,
  onSelectCase,
}: {
  catalog: ReviewCatalog;
  judge: ReviewJudge;
  selectedCaseId?: string;
  onSelectCase: (id: string) => void;
}) {
  const cases = getJudgeCases(judge.id, catalog.version);
  const courtCase = cases.find((item) => item.id === selectedCaseId) ?? cases[0];
  return (
    <main className="bg-[#f7f9fb] px-5 py-8 md:py-12">
      <div className="mx-auto max-w-[1160px]">
        <JudgeProfile judge={judge} catalog={catalog} />
        <div className="mt-9 grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <CaseTimeline
            judge={judge}
            cases={cases}
            selectedCaseId={courtCase.id}
            onSelectCase={onSelectCase}
          />
          <div className="min-w-0 space-y-6">
            <CaseDossier key={courtCase.id} catalog={catalog} judge={judge} courtCase={courtCase} />
            <ReflectionWorkspace
              key={`${judge.id}:${courtCase.id}`}
              catalog={catalog}
              judge={judge}
              courtCase={courtCase}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

function JudgeProfile({ judge, catalog }: { judge: ReviewJudge; catalog: ReviewCatalog }) {
  return (
    <header>
      <Link
        to="/"
        search={{ topics: "" }}
        hash="judges"
        className="inline-flex items-center gap-2 text-xs text-recourt-brandblue hover:underline"
      >
        <LucideArrowLeft className="size-4" aria-hidden="true" /> 裁判官の一覧へ
      </Link>
      <p className="mt-8 text-xs tracking-wide text-[#627382]">掲載裁判当時の最高裁判所裁判官</p>
      <h1 className="mt-3 text-3xl font-semibold text-recourt-brandblue sm:text-4xl">
        {judge.name}
      </h1>
      <p className="mt-2 text-sm text-[#657391]">{judge.reading}</p>
      <p className="mt-5 max-w-3xl text-sm leading-[1.9] text-[#536183]">
        この人が関与した裁判と、そこで示された意見をたどります。掲載は公開資料から選んだ3件です。全裁判の履歴や、裁判官の人物評価を示すものではありません。
      </p>
      <p className="mt-3 text-xs text-[#657391]">
        公開資料 第{catalog.version}版 · {catalog.publishedAt}公開
      </p>
    </header>
  );
}

function CaseTimeline({
  judge,
  cases,
  selectedCaseId,
  onSelectCase,
}: {
  judge: ReviewJudge;
  cases: ReviewCase[];
  selectedCaseId: string;
  onSelectCase: (id: string) => void;
}) {
  const [kind, setKind] = useState("");
  const filtered = cases.filter(
    (courtCase) =>
      !kind ||
      courtCase.opinions.some((opinion) => opinion.judgeId === judge.id && opinion.kind === kind),
  );
  return (
    <aside className="rounded-xl border border-[#dce4ee] bg-white p-5" aria-label="関与した裁判">
      <h2 className="text-base font-semibold text-[#24364e]">関与した裁判</h2>
      <p className="mt-2 text-xs text-[#657391]">裁判日の新しい順</p>
      <label htmlFor="opinion-filter" className="mt-5 block text-xs text-[#657391]">
        個別意見の種類で絞る
      </label>
      <select
        id="opinion-filter"
        value={kind}
        onChange={(event) => setKind(event.target.value)}
        className="mt-2 h-10 w-full rounded-lg border border-[#dce4ee] bg-white px-2 text-xs"
      >
        <option value="">すべての意見</option>
        {Object.entries(opinionLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <ol className="mt-5 space-y-3">
        {filtered.map((courtCase) => {
          const opinion = courtCase.opinions.find((item) => item.judgeId === judge.id)!;
          return (
            <li key={courtCase.id}>
              <button
                type="button"
                onClick={() => onSelectCase(courtCase.id)}
                aria-current={selectedCaseId === courtCase.id ? "true" : undefined}
                className={`w-full rounded-lg border p-4 text-left ${selectedCaseId === courtCase.id ? "border-[#82a9ba] bg-[#eef5f7]" : "border-[#e4eaf1] hover:bg-[#f7f9fb]"}`}
              >
                <time dateTime={courtCase.date} className="text-xs text-[#657391]">
                  {courtCase.date}
                </time>
                <p className="mt-2 text-sm leading-[1.8] font-medium text-[#24364e]">
                  {courtCase.title}
                </p>
                <span className="mt-3 inline-block text-[11px] text-[#24647b]">
                  {opinionLabels[opinion.kind]}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {filtered.length === 0 && (
        <p className="mt-5 text-xs leading-[1.8] text-[#657391]">
          この種類の意見を含む掲載資料はありません。
        </p>
      )}
    </aside>
  );
}

export function CaseDossier({
  catalog,
  judge,
  courtCase,
}: {
  catalog: ReviewCatalog;
  judge: ReviewJudge;
  courtCase: ReviewCase;
}) {
  return (
    <article
      aria-label="裁判と裁判官の意見"
      className="overflow-hidden rounded-xl border border-[#dce4ee] bg-white"
    >
      <DossierHeader catalog={catalog} courtCase={courtCase} />
      <div className="space-y-8 px-5 py-7 sm:px-8">
        <section aria-labelledby="case-conclusion">
          <p className="text-xs font-semibold tracking-wider text-[#24647b]">01 / 裁判全体</p>
          <h3 id="case-conclusion" className="mt-2 text-lg font-semibold text-[#24364e]">
            裁判所は、どう結論づけた？
          </h3>
          <p className="mt-4 text-sm leading-[2] text-[#435371]">{courtCase.conclusion}</p>
          <SourceLink courtCase={courtCase} pages={courtCase.conclusionPages} />
        </section>
        <CaseOpinions catalog={catalog} judge={judge} courtCase={courtCase} />
        <section className="rounded-lg bg-[#f7f9fb] p-4" aria-label="この資料の出典">
          <p className="flex items-center gap-2 text-xs font-semibold text-[#435371]">
            <LucideFileText className="size-4" aria-hidden="true" /> 出典と、この資料について
          </p>
          <p className="mt-3 text-xs leading-[1.9] text-[#657391]">
            解説は裁判当時の判断を要約した固定の公開資料です。引用原文ではありません。ページ番号は裁判所が公開するPDFのページを示します。
          </p>
          <a
            href={courtCase.detailUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-xs text-[#24647b] underline"
          >
            裁判所の裁判例情報を開く
          </a>
        </section>
      </div>
    </article>
  );
}

function SourceLink({ courtCase, pages }: { courtCase: ReviewCase; pages: [number, number] }) {
  return (
    <a
      href={`${courtCase.pdfUrl}#page=${pages[0]}`}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 inline-flex items-center gap-1 text-xs leading-[1.8] font-medium text-[#24647b] underline underline-offset-4"
    >
      原文で確かめる · PDF {pages[0]}
      {pages[0] !== pages[1] ? `–${pages[1]}` : ""}ページ{" "}
      <LucideArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
    </a>
  );
}

function DossierHeader({ catalog, courtCase }: { catalog: ReviewCatalog; courtCase: ReviewCase }) {
  const [copyStatus, setCopyStatus] = useState("");
  async function copyLink() {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("caseId", courtCase.id);
      url.searchParams.set("edition", catalog.version);
      await navigator.clipboard.writeText(url.href);
      setCopyStatus("この資料のリンクをコピーしました。");
    } catch {
      setCopyStatus("アドレスバーのURLから、この資料を共有できます。");
    }
  }
  return (
    <header className="border-b border-[#e4eaf1] px-5 py-7 sm:px-8">
      <Label tone="brand">{courtCase.topic}</Label>
      <h2 className="mt-4 text-2xl leading-[1.6] font-semibold text-[#24364e]">
        {courtCase.title}
      </h2>
      <p className="mt-3 text-sm leading-[1.9] text-[#536183]">{courtCase.question}</p>
      <p className="mt-4 text-xs leading-[1.8] text-[#657391]">
        <time dateTime={courtCase.date}>{courtCase.date}</time> · 最高裁判所大法廷
        <br />
        {courtCase.caseNumber}
      </p>
      <button
        type="button"
        onClick={() => void copyLink()}
        className="mt-4 inline-flex items-center gap-1.5 text-xs text-[#24647b] underline underline-offset-4"
      >
        <LucideLink className="size-3.5" aria-hidden="true" /> この資料のリンクをコピー
      </button>
      <p role="status" className="mt-2 text-xs text-[#657391]">
        {copyStatus}
      </p>
    </header>
  );
}

function CaseOpinions({
  catalog,
  judge,
  courtCase,
}: {
  catalog: ReviewCatalog;
  judge: ReviewJudge;
  courtCase: ReviewCase;
}) {
  return (
    <section aria-labelledby="case-opinions">
      <p className="text-xs font-semibold tracking-wider text-[#24647b]">02 / 一人ひとりの意見</p>
      <h3 id="case-opinions" className="mt-2 text-lg font-semibold text-[#24364e]">
        同じ裁判でも、理由はひとつではない。
      </h3>
      <p className="mt-3 text-xs leading-[1.9] text-[#657391]">
        「反対意見」は裁判の結論に対する区分です。どの部分が同じで、どこが異なるのかをあわせて読みます。ここでは掲載対象の3人の意見を紹介します。
      </p>
      <div className="mt-5 space-y-4">
        {courtCase.opinions.map((opinion) => {
          const author = getReviewJudge(opinion.judgeId, catalog.version)!;
          const active = opinion.judgeId === judge.id;
          return (
            <article
              key={opinion.judgeId}
              id={`opinion-${opinion.judgeId}`}
              className={`scroll-mt-24 rounded-xl border p-5 ${active ? "border-[#8fb1bf] bg-[#f0f6f8]" : "border-[#e2e8ef]"}`}
              aria-label={`${author.name}の${opinionLabels[opinion.kind]}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 className="font-semibold text-[#24364e]">
                  {active ? (
                    author.name
                  ) : (
                    <Link
                      to="/judges/$id"
                      params={{ id: author.id }}
                      search={{ caseId: courtCase.id, edition: catalog.version }}
                      className="underline decoration-[#afbecd] underline-offset-4"
                    >
                      {author.name}
                    </Link>
                  )}
                  {active && (
                    <span className="ml-2 text-[10px] font-normal text-[#52788b]">
                      いま読んでいる裁判官
                    </span>
                  )}
                </h4>
                <Label tone="neutral">{opinionLabels[opinion.kind]}</Label>
              </div>
              <p className="mt-3 text-sm leading-[2] text-[#435371]">{opinion.summary}</p>
              <SourceLink courtCase={courtCase} pages={opinion.pages} />
            </article>
          );
        })}
      </div>
    </section>
  );
}
