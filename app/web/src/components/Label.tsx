import type { ReactNode } from "react";

type LabelTone = "brand" | "success" | "neutral" | "danger";

type LabelProps = {
  children: ReactNode;
  tone?: LabelTone;
  className?: string;
};

const toneClassName: Record<LabelTone, string> = {
  brand: "border border-recourt-brandblue bg-white text-recourt-brandblue",
  success: "bg-[#116c01]",
  neutral: "bg-[#5a5a5a]",
  danger: "bg-[#b30000]",
};

export default function Label({ children, tone = "neutral", className = "" }: LabelProps) {
  return (
    <span
      className={`inline-flex h-4 items-center justify-center overflow-hidden rounded-full px-2 py-0.5 text-[10px] leading-none font-medium ${tone === "brand" ? "" : "text-white"} ${toneClassName[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
