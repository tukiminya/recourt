import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/courts/$id")({ component: CourtPage });

const courtSections = ["第一小法廷", "第二小法廷", "第三小法廷"];
const judges = ["田中太郎", "田中太郎", "田中太郎", "田中太郎", "田中太郎", "田中太郎"];

function JudgeCard({ name, count = 200 }: { name: string; count?: number }) {
  return (
    <article className="flex min-h-[99px] flex-col items-start gap-3.5 overflow-hidden rounded-[14px] bg-[#efefef] p-[22px]">
      <h3 className="w-full text-[24px] leading-normal font-medium text-black">{name}</h3>
      <div className="flex items-end gap-1 whitespace-nowrap">
        <span className="text-[10px] leading-none text-[#5a5a5a]">収録判決数</span>
        <span className="text-[16px] leading-none text-black">{count}件</span>
      </div>
    </article>
  );
}

function CourtSection({ name }: { name: string }) {
  return (
    <section className="flex flex-col items-start gap-[15px]">
      <h2 className="w-full text-[16px] leading-normal font-medium text-[#5a5a5a]">{name}</h2>
      <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2">
        {judges.map((judge, index) => (
          <JudgeCard key={`${name}-${index}`} name={judge} />
        ))}
      </div>
    </section>
  );
}

function CourtPage() {
  return (
    <main className="px-5 pt-[58px] pb-16 lg:px-0">
      <div className="mx-auto grid max-w-[988px] grid-cols-1 gap-12 lg:grid-cols-[316px_652px] lg:gap-5">
        <h1 className="text-[36px] leading-normal font-medium text-neutral-900">最高裁判所</h1>

        <div className="flex flex-col gap-[69px]">
          <section className="flex flex-col items-start gap-4" aria-labelledby="chief-judge">
            <h2
              id="chief-judge"
              className="w-full text-[16px] leading-normal font-medium text-[#5a5a5a]"
            >
              長官
            </h2>
            <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2">
              <JudgeCard name="田中太郎" />
            </div>
          </section>

          {courtSections.map((section) => (
            <CourtSection key={section} name={section} />
          ))}
        </div>
      </div>
    </main>
  );
}
