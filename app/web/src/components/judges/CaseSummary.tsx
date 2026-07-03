import { LucideCheck } from "lucide-react";

type CaseSummaryProps = {
  summary: Array<string>;
  repeated?: boolean;
};

export default function CaseSummary({ summary, repeated = false }: CaseSummaryProps) {
  return (
    <section className="space-y-[18px]">
      <div className="flex items-center gap-6">
        <h2 className="text-[11px] font-medium whitespace-nowrap text-recourt-brandblue">まとめ</h2>
        <div className="h-px flex-1 bg-recourt-brandblue" />
      </div>
      <ul className="space-y-[14px]">
        {summary.map((item) => (
          <li key={item} className="flex items-start gap-[14px]">
            <LucideCheck
              className="mt-0.5 h-5 w-5 shrink-0 text-neutral-900"
              strokeWidth={1.7}
              aria-hidden="true"
            />
            <span className="text-[16px] leading-[1.6] tracking-[0.02em] text-neutral-900">
              {item}
            </span>
          </li>
        ))}
      </ul>
      {repeated ? <div className="h-px w-full bg-recourt-brandblue" /> : null}
    </section>
  );
}
