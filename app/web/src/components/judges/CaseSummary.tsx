import { LucideCheck } from "lucide-react";
import type { JudgeCase } from "../../data/judges";
import { richTextToMarkdown } from "../../data/judges";

type CaseSummaryProps = {
  summary: JudgeCase["summary"]["items"];
  entities: JudgeCase["entities"];
};

export default function CaseSummary({ summary, entities }: CaseSummaryProps) {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-6">
        <h2 className="text-[11px] font-medium whitespace-nowrap text-recourt-brandblue">まとめ</h2>
        <div className="h-px flex-1 bg-recourt-brandblue" />
      </div>
      <ul className="space-y-4">
        {summary.map((item, index) => (
          <li key={index} className="flex items-start gap-4">
            <LucideCheck
              className="mt-0.5 h-5 w-5 shrink-0 text-neutral-900"
              strokeWidth={1.7}
              aria-hidden="true"
            />
            <span className="text-lg leading-[1.6] tracking-[0.02em] text-neutral-900">
              {richTextToMarkdown(item.blocks, entities)}
            </span>
          </li>
        ))}
      </ul>
      <div className="h-px w-full bg-recourt-brandblue" />
    </section>
  );
}
