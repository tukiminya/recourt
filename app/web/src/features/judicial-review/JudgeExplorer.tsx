import { Link } from "@tanstack/react-router";
import { LucideArrowRight, LucideBookOpen, LucideSearch } from "lucide-react";
import { useState } from "react";
import { getJudgeCases, reviewCatalog } from "@recourt/api/review-catalog";
import type { ReviewJudge } from "@recourt/types";
import Label from "../../components/Label";

export default function JudgeExplorer() {
  return (
    <>
      <ReviewHero />
      <JudgeDirectory />
      <ReadingPrinciples />
    </>
  );
}

function ReviewHero() {
  return (
    <section className="bg-[#eef5f7] px-5 py-16 md:py-24">
      <div className="mx-auto grid max-w-[1160px] gap-12 lg:grid-cols-[1.4fr_1fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[#24647b]">
            知ることから、はじまる国民審査。
          </p>
          <h1 className="mt-6 text-[clamp(2.25rem,4.5vw,4rem)] leading-[1.45] font-semibold tracking-tight text-recourt-brandblue">
            その判断を、たどる。
            <br />
            自分の考えを、持つ。
          </h1>
          <p className="mt-6 max-w-xl text-base leading-[2] text-[#465b66]">
            あの裁判で、誰が、何を根拠に判断したのか。
            <br className="hidden sm:block" />
            裁判官の意見と原文を読みながら、あなたが大切にしたいことを考える場所です。
          </p>
          <a
            href="#judges"
            className="mt-8 inline-flex min-h-12 items-center gap-5 rounded-lg bg-recourt-brandblue px-6 text-sm font-medium text-white hover:bg-[#17277e]"
          >
            裁判官から知る <LucideArrowRight className="size-4" aria-hidden="true" />
          </a>
          <p className="mt-4 text-xs text-[#526976]">
            読むだけでも大丈夫。意見の表明は、いつでも任意です。
          </p>
        </div>
        <div className="rounded-2xl border border-[#d5e3e8] bg-white p-7 sm:p-9">
          <p className="flex items-center gap-2 text-xs font-semibold text-[#24647b]">
            <LucideBookOpen className="size-4" aria-hidden="true" /> みんなで参照できる、同じ資料。
          </p>
          <ol className="mt-7 space-y-6">
            {[
              ["01", "裁判官を知る", "関与した裁判から、その人の判断をたどる。"],
              ["02", "意見と原文を読む", "裁判の結論と、一人ひとりの理由を分けて読む。"],
              ["03", "自分の考えを持つ", "考えたことをメモする。重視した論点は任意で共有。"],
            ].map(([number, title, description]) => (
              <li key={number} className="flex gap-4">
                <span className="pt-1 font-mono text-xs text-[#508197]">{number}</span>
                <div>
                  <p className="font-semibold text-[#203e50]">{title}</p>
                  <p className="mt-2 text-xs leading-[1.8] text-[#60727e]">{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

export function JudgeDirectory() {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("");
  const topics = [...new Set(reviewCatalog.cases.map((courtCase) => courtCase.topic))];
  const normalized = query.replace(/\s/g, "").toLocaleLowerCase("ja");
  const judges = reviewCatalog.judges.filter(
    (judge) =>
      `${judge.name}${judge.reading}`.replace(/\s/g, "").includes(normalized) &&
      getJudgeCases(judge.id).some((courtCase) => !topic || courtCase.topic === topic),
  );
  return (
    <section
      id="judges"
      className="scroll-mt-24 px-5 py-14 md:py-20"
      aria-labelledby="judges-heading"
    >
      <div className="mx-auto max-w-[1160px]">
        <p className="text-xs font-semibold tracking-[0.16em] text-[#24647b]">JUDGES / 公開資料</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
          <h2
            id="judges-heading"
            className="text-2xl font-semibold text-recourt-brandblue md:text-3xl"
          >
            どんな判断をしてきた人だろう。
          </h2>
          <span className="text-xs text-[#657391]">
            資料公開日 <time dateTime={reviewCatalog.publishedAt}>{reviewCatalog.publishedAt}</time>
          </span>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-[1.9] text-[#536183]">
          初版は3件の裁判と、そこに関与した3人を掲載しています。現職の裁判官や、次回の国民審査の対象者の一覧ではありません。
        </p>
        <DirectoryControls
          query={query}
          setQuery={setQuery}
          topic={topic}
          setTopic={setTopic}
          topics={topics}
        />
        <p className="mt-6 text-xs text-[#657391]" role="status">
          {judges.length}人の資料を表示
        </p>
        <div className="mt-4 grid gap-5 md:grid-cols-3">
          {judges.map((judge) => (
            <JudgeCard key={judge.id} judge={judge} topic={topic} />
          ))}
        </div>
        {judges.length === 0 && (
          <div className="mt-4 rounded-xl bg-[#f5f7fa] p-8 text-center">
            <p className="text-sm text-[#536183]">一致する裁判官の資料はありません。</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setTopic("");
              }}
              className="mt-4 text-sm text-recourt-brandblue underline"
            >
              条件をリセット
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function ReadingPrinciples() {
  return (
    <section className="border-t border-[#e5eaf1] bg-[#fafbfc] px-5 py-12">
      <div className="mx-auto grid max-w-[1160px] gap-8 md:grid-cols-3">
        {[
          [
            "判断は、あなたのもの。",
            "裁判官の点数やおすすめ順位は付けません。異なる意見を、自分で考えるための資料として届けます。",
          ],
          [
            "原文まで、たどれる。",
            "資料の版と出典を明示します。解説の要約と、裁判所の原文は区別して読むことができます。",
          ],
          [
            "考えの途中も、大切に。",
            "読むだけでも、迷っていても構いません。メモは自分の端末に。論点の共有は選んだときだけ。",
          ],
        ].map(([title, description]) => (
          <div key={title}>
            <h2 className="font-semibold text-[#29495d]">{title}</h2>
            <p className="mt-3 text-sm leading-[1.9] text-[#637180]">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DirectoryControls({
  query,
  setQuery,
  topic,
  setTopic,
  topics,
}: {
  query: string;
  setQuery: (value: string) => void;
  topic: string;
  setTopic: (value: string) => void;
  topics: string[];
}) {
  return (
    <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2" role="group" aria-label="関心のある話題">
        {["", ...topics].map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={topic === item}
            onClick={() => setTopic(item)}
            className={`rounded-full border px-4 py-2 text-xs font-medium ${topic === item ? "border-recourt-brandblue bg-recourt-brandblue text-white" : "border-[#d9e2ed] text-[#536183] hover:bg-[#f3f7fa]"}`}
          >
            {item || "すべての話題"}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-[#d9e2ed] px-3 focus-within:border-[#6f98ad] focus-within:ring-2 focus-within:ring-[#e1edf1] sm:w-60">
        <LucideSearch className="size-4 text-[#748093]" aria-hidden="true" />
        <label htmlFor="judge-search" className="sr-only">
          裁判官の名前で探す
        </label>
        <input
          id="judge-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="裁判官の名前で探す"
          className="h-11 min-w-0 flex-1 text-sm outline-none"
        />
      </div>
    </div>
  );
}

function JudgeCard({ judge, topic }: { judge: ReviewJudge; topic: string }) {
  const cases = getJudgeCases(judge.id).filter((courtCase) => !topic || courtCase.topic === topic);
  return (
    <article className="flex flex-col rounded-xl border border-[#dce4ee] bg-white p-6">
      <p className="text-xs text-[#657391]">掲載裁判当時の最高裁判所裁判官</p>
      <h3 className="mt-5 text-2xl font-semibold text-[#24364e]">{judge.name}</h3>
      <p className="mt-1 text-xs text-[#657391]">{judge.reading}</p>
      <div className="mt-5 flex flex-wrap gap-1.5">
        {[...new Set(cases.map((courtCase) => courtCase.topic))].map((label) => (
          <Label key={label} tone="neutral">
            {label}
          </Label>
        ))}
      </div>
      <p className="mt-6 border-t border-[#e5eaf1] pt-5 text-xs text-[#657391]">掲載資料から</p>
      <ul className="mt-3 flex-1 space-y-3 text-sm leading-[1.8] text-[#435371]">
        {cases.slice(0, 2).map((courtCase) => (
          <li key={courtCase.id}>{courtCase.title}</li>
        ))}
      </ul>
      <Link
        to="/judges/$id"
        params={{ id: judge.id }}
        search={{ caseId: cases[0]?.id, edition: reviewCatalog.version }}
        className="mt-7 flex min-h-11 items-center justify-between rounded-lg bg-[#eef5f7] px-4 text-sm font-medium text-recourt-brandblue hover:bg-[#e1edf1]"
      >
        判断をたどる <LucideArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </article>
  );
}
