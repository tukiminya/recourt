import { createFileRoute } from "@tanstack/react-router";
import Label from "../components/Label";

export const Route = createFileRoute("/judges/$id")({ component: JudgePage });

type Opinion = "agreed" | "additional" | "disagreed";

const opinions: Array<{ opinion: Opinion; title: string }> = [
  { opinion: "agreed", title: "世界平和統一家庭連合に対しての解散命令の決定" },
  { opinion: "additional", title: "世界平和統一家庭連合に対しての解散命令の決定" },
  { opinion: "disagreed", title: "世界平和統一家庭連合に対しての解散命令の決定" },
];

function Agreed({ opinion }: { opinion: Opinion }) {
  const label = {
    agreed: { children: "同意", tone: "success" as const },
    additional: { children: "補足意見", tone: "neutral" as const },
    disagreed: { children: "反対意見", tone: "danger" as const },
  }[opinion];

  return <Label tone={label.tone}>{label.children}</Label>;
}

function OpinionItem({ opinion, title }: (typeof opinions)[number]) {
  return (
    <article className="flex flex-col items-start gap-2 overflow-hidden py-2.5">
      <Agreed opinion={opinion} />
      <h2 className="text-[20px] leading-normal font-medium text-black">{title}</h2>
      <div className="flex items-start gap-5 text-[12px] leading-normal text-[#5a5a5a]">
        <time dateTime="2026-03-21">2026年3月21日</time>
        <span>最高裁判所 第三小法廷</span>
      </div>
    </article>
  );
}

function JudgePage() {
  return (
    <main className="px-5 pt-[58px] pb-16 lg:px-0">
      <div className="mx-auto grid max-w-[988px] grid-cols-1 gap-12 lg:grid-cols-[316px_652px] lg:gap-5">
        <section aria-labelledby="judge-name" className="flex flex-col gap-[18px]">
          <h1 id="judge-name" className="text-[36px] leading-normal font-medium text-neutral-900">
            渡邉惠理子
          </h1>
          <p className="text-[16px] leading-normal text-[#5a5a5a]">最高裁判所判事 / 第三小法廷</p>
        </section>

        <section aria-label="担当した判例" className="flex flex-col gap-3">
          {opinions.map((item) => (
            <OpinionItem key={item.opinion} {...item} />
          ))}
        </section>
      </div>
    </main>
  );
}
