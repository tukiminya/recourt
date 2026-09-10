import { LucideGavel } from "lucide-react";
import { AffectedPartyItem } from "./AffectedParties";
import type { JudgeCase } from "../../data/judges";
import { getBlockRichText, richTextToMarkdown } from "../../data/judges";
import { MarkdownRenderer } from "../../integrations/markdown/markdown";

type CaseSectionProps = {
  section: JudgeCase["sections"][number];
  entities: JudgeCase["entities"];
  showTitle?: boolean;
};

export default function CaseSection({ section, entities, showTitle = true }: CaseSectionProps) {
  return (
    <section className="space-y-4">
      {showTitle ? (
        <h2 className="text-xs font-medium whitespace-nowrap text-neutral-600">{section.title}</h2>
      ) : null}
      <div className="space-y-4">
        {section.blocks.map((block, index) => {
          const content = richTextToMarkdown(getBlockRichText(block), entities);

          switch (block.type) {
            case "heading_3":
              return (
                <h3 key={index} className="text-lg leading-normal font-medium text-neutral-900">
                  <MarkdownRenderer inline>{content}</MarkdownRenderer>
                </h3>
              );
            case "bulleted_list_item":
              return (
                <div key={index} className="flex items-start gap-[14px]">
                  <LucideGavel
                    className="mt-1 h-4 w-4 shrink-0 text-neutral-900"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  <MarkdownRenderer paragraphClassName="m-0 flex-1 text-[16px] leading-[1.6] tracking-[0.02em] text-neutral-900">
                    {content}
                  </MarkdownRenderer>
                </div>
              );
            case "numbered_list_item":
              return (
                <MarkdownRenderer key={index} paragraphClassName="m-0">
                  {`${index + 1}. ${content}`}
                </MarkdownRenderer>
              );
            case "paragraph":
              return <MarkdownRenderer key={index}>{content}</MarkdownRenderer>;
            case "with_icon_list_item":
              return <AffectedPartyItem key={index} party={block} entities={entities} />;
          }
        })}
      </div>
    </section>
  );
}
