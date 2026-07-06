import type { CaseSection as CaseSectionData } from "../../data/judges";
import { MarkdownRenderer } from "../../integrations/markdown/markdown";

type CaseSectionProps = {
  section: CaseSectionData;
  showTitle?: boolean;
};

export default function CaseSection({ section, showTitle = true }: CaseSectionProps) {
  return (
    <section className="space-y-4">
      {showTitle ? (
        <h2 className="text-xs font-medium whitespace-nowrap text-neutral-600">{section.title}</h2>
      ) : null}
      <div className="space-y-2">
        {section.heading ? (
          <h3 className="text-lg leading-normal font-medium text-neutral-900">{section.heading}</h3>
        ) : null}
        <div className="space-y-4">
          {section.body.map((paragraph, index) => (
            <MarkdownRenderer key={index}>{paragraph}</MarkdownRenderer>
          ))}
        </div>
      </div>
    </section>
  );
}
