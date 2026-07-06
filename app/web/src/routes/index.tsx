import { Link, createFileRoute } from "@tanstack/react-router";
import {
  LucideArrowRight,
  LucideFileSearch,
  LucideGalleryVerticalEnd,
  LucideGavel,
  LucideLayers,
  LucideMessageSquareMore,
  LucideSearch,
} from "lucide-react";
import { cloneElement, type ReactElement, type ReactNode } from "react";
import { judges } from "../data/judges";

export const Route = createFileRoute("/")({ component: App });

function App() {
  const featuredCases = judges.slice(0, 3);

  return (
    <main>
      <section className="flex min-h-80 items-center justify-center bg-recourt-brandblue px-5 py-16 text-white md:min-h-100">
        <div className="flex w-full max-w-[720px] flex-col items-center">
          <h1 className="text-center text-[28px] leading-[1.45] font-medium md:text-[32px]">
            判例を誰でも読める時代に。
          </h1>
          <form
            className="relative mt-6 flex h-10 w-full max-w-[400px] items-center overflow-hidden rounded-lg border border-[#dadada] bg-white"
            role="search"
            aria-label="判例を検索"
            onSubmit={(event) => event.preventDefault()}
          >
            <LucideSearch
              className="pointer-events-none absolute left-3 h-3 w-3 text-neutral-600"
              strokeWidth={1.7}
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="フリーワード検索"
              className="h-full w-full border-0 bg-white pr-3 pl-8 text-[12px] text-neutral-700 outline-none placeholder:text-[#5a5a5a]"
            />
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-[1040px] px-5 pt-16 pb-4 md:pt-20">
        <section>
          <SectionHeader
            label="注目の判例"
            title="いま読める判例"
            description="裁判所の判断を、経緯・争点・理由・影響に分けて読みやすく整理しています。"
          />
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featuredCases.map((judgeCase) => (
              <Link
                key={judgeCase.id}
                to="/cases/$id"
                params={{ id: judgeCase.id }}
                className="group flex min-h-[260px] flex-col rounded-lg border border-neutral-200 bg-white p-6 hover:border-recourt-brandblue"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Pill>{judgeCase.kind}</Pill>
                  <Pill>{judgeCase.result}</Pill>
                </div>
                <h3 className="mt-5 text-[20px] leading-[1.45] font-medium text-neutral-900 group-hover:text-recourt-brandblue">
                  {judgeCase.title.name}
                </h3>
                <p className="mt-3 text-[12px] leading-normal text-neutral-600">
                  {judgeCase.court}
                </p>
                <ul className="mt-5 space-y-2">
                  {judgeCase.summary.slice(0, 3).map((summary) => (
                    <li
                      key={summary}
                      className="flex items-start gap-2 text-[14px] leading-[1.6] text-neutral-800"
                    >
                      <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-recourt-brandblue" />
                      <span>{summary}</span>
                    </li>
                  ))}
                </ul>
                <span className="mt-auto inline-flex items-center gap-1 pt-6 text-[13px] font-medium text-recourt-brandblue">
                  判例を読む
                  <LucideArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    strokeWidth={1.7}
                    aria-hidden="true"
                  />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <SectionHeader
            label="探し方"
            title="知りたい入口から探す"
            description="事件名がわからなくても、言葉・争点・裁判所の情報から判例にたどり着けるようにしていきます。"
          />
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <GuideCard
              icon={<LucideSearch aria-hidden="true" />}
              title="キーワードで探す"
              description="ニュースで見た言葉や、気になる制度名から関係する判例を探します。"
            />
            <GuideCard
              icon={<LucideGavel aria-hidden="true" />}
              title="争点から読む"
              description="裁判所が何を問題にし、どのように判断したのかを中心に読み進めます。"
            />
            <GuideCard
              icon={<LucideFileSearch aria-hidden="true" />}
              title="裁判所・事件番号で確認する"
              description="裁判所名、事件番号、種別などの手がかりから目的の判例を確認します。"
            />
          </div>
        </section>

        <section className="mt-20 grid gap-10 border-t border-neutral-200 pt-14 md:grid-cols-[320px_1fr] md:gap-16">
          <div>
            <p className="text-[11px] font-medium text-recourt-brandblue">再考裁で読めること</p>
            <h2 className="mt-3 text-[28px] leading-[1.4] font-medium text-neutral-900">
              難しい判例を、読む順番ごとに整理する
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {readingSteps.map((step) => (
              <div key={step.title} className="rounded-lg border border-neutral-200 bg-white p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-recourt-brandblue">
                  {step.icon}
                </div>
                <h3 className="mt-5 text-[18px] leading-normal font-medium text-neutral-900">
                  {step.title}
                </h3>
                <p className="mt-3 text-[14px] leading-[1.7] text-neutral-700">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function SectionHeader({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-[640px]">
      <p className="text-[11px] font-medium text-recourt-brandblue">{label}</p>
      <h2 className="mt-3 text-[28px] leading-[1.4] font-medium text-neutral-900">{title}</h2>
      <p className="mt-4 text-[15px] leading-[1.8] text-neutral-700">{description}</p>
    </div>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-6 items-center rounded-full border border-neutral-200 bg-neutral-100 px-3 text-[11px] font-medium text-neutral-700">
      {children}
    </span>
  );
}

function GuideCard({
  icon,
  title,
  description,
}: {
  icon: ReactElement<{ className?: string; strokeWidth?: number }>;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-lg border border-neutral-200 bg-white p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-recourt-brandblue text-white">
        {/*
          Clone only to keep the icon API local to this small presentational helper.
        */}
        {cloneElement(icon, { className: "h-5 w-5", strokeWidth: 1.7 })}
      </div>
      <h3 className="mt-5 text-[18px] leading-normal font-medium text-neutral-900">{title}</h3>
      <p className="mt-3 text-[14px] leading-[1.7] text-neutral-700">{description}</p>
    </article>
  );
}

const readingSteps = [
  {
    title: "経緯",
    description: "事件が裁判所に届くまでに、何が起きていたのかを先に確認します。",
    icon: <LucideGalleryVerticalEnd className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />,
  },
  {
    title: "争点",
    description: "当事者の主張のうち、裁判所が判断する必要のあったポイントを整理します。",
    icon: <LucideGavel className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />,
  },
  {
    title: "判断理由",
    description: "裁判所が条文や過去の考え方をどう使って結論に至ったのかを読みます。",
    icon: <LucideMessageSquareMore className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />,
  },
  {
    title: "影響",
    description: "その判断が、社会や似た事件にどのような意味を持つのかを見通します。",
    icon: <LucideLayers className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />,
  },
];
