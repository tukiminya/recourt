import type { ReactNode } from "react";

type BadgeTone = "brand" | "neutral" | "success";

type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
};

const toneClassName: Record<BadgeTone, string> = {
  brand: "border-recourt-brandblue text-recourt-brandblue bg-white",
  neutral: "border-neutral-200 bg-neutral-100 text-neutral-700",
  success: "border-green-700 bg-green-700 text-white",
};

export default function Badge({ children, tone = "neutral" }: BadgeProps) {
  return (
    <span
      className={`inline-flex h-4 items-center rounded-full border px-2 py-0.5 text-[10px] leading-none font-medium ${toneClassName[tone]}`}
    >
      {children}
    </span>
  );
}
