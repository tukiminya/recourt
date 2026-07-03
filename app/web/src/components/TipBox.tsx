import { LucideSquareArrowOutUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "./Link";

type TipBoxProps = {
  id?: string;
  title: string;
  children: ReactNode;
  sourceLabel?: string;
  sourceUrl?: string;
  className?: string;
};

export default function TipBox({
  id,
  title,
  children,
  sourceLabel,
  sourceUrl,
  className,
}: TipBoxProps) {
  return (
    <aside
      id={id}
      className={["rounded-lg border-2 border-neutral-200 bg-white p-6 shadow-xl", className]
        .filter(Boolean)
        .join(" ")}
    >
      <h2 className="text-[20px] leading-normal font-medium text-black">{title}</h2>
      <div className="mt-[14px] text-[16px] leading-[1.6] tracking-[0.02em] text-black">
        {children}
      </div>
      {sourceLabel && sourceUrl ? (
        <div className="mt-[14px] flex items-center gap-1.5">
          <Link href={sourceUrl} target="_blank" rel="noreferrer">
            {sourceLabel}
          </Link>
          <LucideSquareArrowOutUpRight
            className="h-3 w-3 text-recourt-brandblue"
            aria-hidden="true"
          />
        </div>
      ) : null}
    </aside>
  );
}
