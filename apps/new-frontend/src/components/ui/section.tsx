import type { ComponentPropsWithoutRef, ReactNode } from "react";

function Section(props: ComponentPropsWithoutRef<"section">) {
  return <section {...props}>{props.children}</section>;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-4 items-center mb-4">
      <h2 className="shrink-0 text-neutral-600 text-xs font-sans">{children}</h2>
    </div>
  );
}

export { Section, SectionTitle };
