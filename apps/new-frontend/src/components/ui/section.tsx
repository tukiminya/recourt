import type { ComponentPropsWithoutRef, ReactNode } from "react";

function Section(props: ComponentPropsWithoutRef<"section">) {
  return <section {...props}>{props.children}</section>;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-4 items-center mb-4">
      <h2 className="shrink-0 text-neutral-500 text-sm font-sans">{children}</h2>
      <hr className="border-neutral-100 border flex-1 w-full" />
    </div>
  );
}

export { Section, SectionTitle };
