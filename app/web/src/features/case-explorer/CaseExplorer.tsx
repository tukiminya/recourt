import {
  LucideArrowRight,
  LucideBookOpen,
  LucideCheck,
  LucideMessageCircle,
  LucideSearch,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import Label from "../../components/Label";
import { fetchCases, fetchTopics } from "./api-client";

export default function CaseExplorer({
  selectedTopics,
  onTopicsChange,
}: {
  selectedTopics: string[];
  onTopicsChange: (topics: string[]) => void;
}) {
  function toggleTopic(topic: string) {
    onTopicsChange(
      selectedTopics.includes(topic)
        ? selectedTopics.filter((item) => item !== topic)
        : [...selectedTopics, topic],
    );
  }
  return (
    <>
      <TopicHero selectedTopics={selectedTopics} onToggleTopic={toggleTopic} />
      <MatchingCases key={selectedTopics.join(",")} selectedTopics={selectedTopics} />
      <SourceNotice />
    </>
  );
}

function TopicHero({
  selectedTopics,
  onToggleTopic,
}: {
  selectedTopics: string[];
  onToggleTopic: (topic: string) => void;
}) {
  return (
    <section id="try" className="scroll-mt-[72px] bg-[#f7f9ff] px-5 py-14 md:py-20">
      <div className="mx-auto grid max-w-[1160px] items-center gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
        <div>
          <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#e7edff] px-3 py-1.5 text-xs font-medium text-recourt-brandblue">
            <span className="h-1.5 w-1.5 rounded-full bg-recourt-brandblue" />
            裁判所の判決を、一緒に読む
          </p>
          <h1 className="max-w-[680px] text-[clamp(2.4rem,4.7vw,4.4rem)] leading-[1.35] font-semibold tracking-tight text-recourt-brandblue">
            気になる言葉から、
            <br />
            判例を読み解く。
          </h1>
          <p className="mt-6 max-w-[630px] text-base leading-[1.9] text-[#3d4b6c] md:text-lg">
            裁判所が公開した判決の中から、関心のある話題を選ぶ。気になった裁判を、自分の疑問から一緒に読んでいけます。
          </p>
          <TopicPicker selectedTopics={selectedTopics} onToggleTopic={onToggleTopic} />
        </div>
        <ReadingPreview />
      </div>
    </section>
  );
}

function TopicPicker({
  selectedTopics,
  onToggleTopic,
}: {
  selectedTopics: string[];
  onToggleTopic: (topic: string) => void;
}) {
  const [showAllTopics, setShowAllTopics] = useState(false);
  const topicsQuery = useQuery({
    queryKey: ["reading-topics"],
    queryFn: ({ signal }) => fetchTopics(signal),
    retry: false,
    staleTime: 60_000,
  });
  const visibleTopics = topicsQuery.data?.filter(
    (topic, index) => showAllTopics || index < 16 || selectedTopics.includes(topic.id),
  );
  return (
    <div className="mt-9" aria-labelledby="topic-heading">
      <h2 id="topic-heading" className="text-lg font-semibold text-[#1d2b4f] md:text-xl">
        あなたの興味あるトピックは？
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[#657391]">
        複数選べます。選んだ話題のいずれかに関連する裁判を表示します。
      </p>
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="興味あるトピック">
        {visibleTopics?.map((topic) => {
          const selected = selectedTopics.includes(topic.id);
          return (
            <button
              key={topic.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onToggleTopic(topic.id)}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-recourt-brandblue ${
                selected
                  ? "border-recourt-brandblue bg-recourt-brandblue text-white"
                  : "border-[#cbd8f4] bg-white text-recourt-brandblue hover:border-recourt-brandblue hover:bg-[#edf2ff]"
              }`}
            >
              {selected ? <LucideCheck className="h-3.5 w-3.5" aria-hidden="true" /> : null}
              {topic.label}
              <span className="text-xs opacity-60">{topic.count}</span>
            </button>
          );
        })}
      </div>
      {(topicsQuery.data?.length ?? 0) > 16 ? (
        <button
          type="button"
          aria-expanded={showAllTopics}
          onClick={() => setShowAllTopics((value) => !value)}
          className="mt-4 text-sm font-medium text-recourt-brandblue underline underline-offset-4"
        >
          {showAllTopics ? "トピックを少なく表示" : "他のトピックも見る"}
        </button>
      ) : null}
      {topicsQuery.isPending ? (
        <p role="status" className="mt-4 text-sm text-[#657391]">
          トピックを読み込んでいます…
        </p>
      ) : null}
      {topicsQuery.error ? (
        <p role="alert" className="mt-4 text-sm text-[#a13c34]">
          トピックを取得できませんでした。
          <button
            type="button"
            onClick={() => void topicsQuery.refetch()}
            className="ml-2 underline"
          >
            もう一度読み込む
          </button>
        </p>
      ) : null}
      {topicsQuery.data?.length === 0 ? (
        <p className="mt-4 text-sm text-[#657391]">
          読める判例を準備しています。準備ができるとトピックが表示されます。
        </p>
      ) : null}
    </div>
  );
}

function ReadingPreview() {
  return (
    <div
      aria-label="判例読解のイメージ"
      className="rounded-2xl border border-[#dbe4f8] bg-white p-5 shadow-[0_28px_70px_rgba(0,9,103,0.10)] sm:p-6"
    >
      <div className="flex items-center gap-3 border-b border-[#e8edfa] pb-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e9efff] text-recourt-brandblue">
          <LucideBookOpen className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-medium text-[#61708f]">ひとつの裁判を、一緒に</p>
          <p className="text-sm font-semibold text-recourt-brandblue">背景から判断理由まで</p>
        </div>
      </div>
      <div className="space-y-4 py-6">
        <p className="text-xs font-medium text-[#61708f]">婚姻制度の扱いをめぐる裁判（表示例）</p>
        <p className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[#eaf0ff] px-4 py-3 text-sm leading-[1.8] text-[#203872]">
          何が争点になったの？
        </p>
        <div className="flex items-start gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-recourt-brandblue text-xs font-semibold text-white">
            再
          </span>
          <p className="rounded-2xl rounded-tl-sm bg-[#f1f5ff] px-4 py-3 text-sm leading-[1.8] text-[#263759]">
            まず、当事者が何を求め、裁判所がどの点を判断したかを分けて見ましょう。
          </p>
        </div>
      </div>
      <div className="flex items-start gap-2 rounded-xl border border-[#dbe4f8] bg-[#fbfcff] p-4 text-xs leading-relaxed text-[#566581]">
        <LucideMessageCircle
          className="mt-0.5 h-4 w-4 shrink-0 text-recourt-brandblue"
          aria-hidden="true"
        />
        <p>気になるところを質問しながら、判決を読み進める画面を試せます。</p>
      </div>
    </div>
  );
}

function MatchingCases({ selectedTopics }: { selectedTopics: string[] }) {
  const [offset, setOffset] = useState(0);
  const casesQuery = useQuery({
    queryKey: ["reading-cases", selectedTopics, offset],
    queryFn: ({ signal }) => fetchCases(selectedTopics, offset, signal),
    enabled: selectedTopics.length > 0,
    retry: false,
  });
  const matches = casesQuery.data?.cases ?? [];

  return (
    <section className="px-5 py-14 md:py-18" aria-labelledby="matching-cases-heading">
      <div className="mx-auto max-w-[1160px]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-widest text-recourt-brandblue">CASES</p>
            <h2
              id="matching-cases-heading"
              className="mt-3 text-2xl font-semibold text-[#1d2b4f] md:text-3xl"
            >
              気になる裁判を選ぶ
            </h2>
          </div>
          {casesQuery.data ? (
            <p className="text-sm text-[#657391]">
              {casesQuery.data.total}件の裁判が見つかりました
            </p>
          ) : null}
        </div>

        <div className="mt-8" aria-live="polite">
          {selectedTopics.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-[#d5def2] bg-[#fbfcff] px-6 py-10 text-center">
              <LucideSearch className="h-6 w-6 text-[#8998b9]" aria-hidden="true" />
              <p className="mt-4 text-sm text-[#536183]">
                トピックを選ぶと、関連する裁判がここに表示されます。
              </p>
            </div>
          ) : casesQuery.isPending ? (
            <p role="status" className="py-10 text-sm text-[#657391]">
              関連する裁判を読み込んでいます…
            </p>
          ) : casesQuery.error ? (
            <p role="alert" className="py-10 text-sm text-[#a13c34]">
              裁判を取得できませんでした。
              <button
                type="button"
                onClick={() => void casesQuery.refetch()}
                className="ml-2 underline"
              >
                もう一度読み込む
              </button>
            </p>
          ) : matches.length === 0 ? (
            <p className="py-10 text-sm text-[#657391]">
              このトピックに関連する裁判はまだありません。
            </p>
          ) : (
            <ul className="divide-y divide-[#e4eafa] border-y border-[#e4eafa]">
              {matches.map((courtCase) => (
                <li
                  key={courtCase.id}
                  className="flex flex-col gap-5 py-6 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-1.5">
                      {courtCase.topics
                        .filter((topic) => selectedTopics.includes(topic.id))
                        .map((topic) => (
                          <Label key={topic.id} tone="brand">
                            {topic.label}
                          </Label>
                        ))}
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-[#1d2b4f]">{courtCase.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#536183]">
                      {courtCase.description}
                    </p>
                    <p className="mt-2 text-xs text-[#7784a1]">
                      {courtCase.courtName} · {courtCase.decisionDate ?? "裁判日不明"} ·{" "}
                      {courtCase.caseNumber}
                    </p>
                  </div>
                  <Link
                    to="/cases/$id"
                    params={{ id: courtCase.id }}
                    search={{ topics: selectedTopics.join(",") }}
                    className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-[#cbd8f4] px-4 py-2 text-sm font-medium text-recourt-brandblue hover:border-recourt-brandblue hover:bg-[#f4f7ff] sm:self-auto"
                  >
                    一緒に読む <LucideArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        {casesQuery.data && casesQuery.data.total > 20 ? (
          <nav
            aria-label="裁判一覧のページ"
            className="mt-6 flex items-center justify-end gap-5 text-sm text-recourt-brandblue"
          >
            <button
              type="button"
              disabled={offset === 0}
              onClick={() => setOffset((current) => current - 20)}
              className="disabled:opacity-40"
            >
              前の20件
            </button>
            <span>
              {offset + 1}〜{Math.min(offset + 20, casesQuery.data.total)}件
            </span>
            <button
              type="button"
              disabled={offset + 20 >= casesQuery.data.total}
              onClick={() => setOffset((current) => current + 20)}
              className="disabled:opacity-40"
            >
              次の20件
            </button>
          </nav>
        ) : null}
      </div>
    </section>
  );
}

function SourceNotice() {
  return (
    <section className="bg-[#f7f9ff] px-5 py-11" aria-labelledby="mock-notice-heading">
      <div className="mx-auto max-w-[1160px] rounded-2xl border border-[#dce5fa] bg-white p-6 md:p-8">
        <p className="text-xs font-medium text-recourt-brandblue">原文を確かめながら</p>
        <h2 id="mock-notice-heading" className="mt-2 text-lg font-semibold text-[#1d2b4f]">
          説明の根拠まで、一緒に読む。
        </h2>
        <p className="mt-2 max-w-[780px] text-sm leading-[1.9] text-[#536183]">
          裁判所が公開した判決をもとに説明します。気になった説明から原文の抜粋やPDFのページを確認し、自分の疑問に合わせて読み進められます。
        </p>
      </div>
    </section>
  );
}
