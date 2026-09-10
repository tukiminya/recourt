import { LucideBuilding, LucideGavel, LucideLandmark, LucideUsersRound } from "lucide-react";
import type { JudgeCase } from "../../data/judges";
import { richTextToMarkdown } from "../../data/judges";

type AffectedPartiesProps = {
  parties: Array<
    Extract<JudgeCase["sections"][number]["blocks"][number], { type: "with_icon_list_item" }>
  >;
  entities: JudgeCase["entities"];
};

const iconByStorageType = {
  issue: LucideGavel,
  organization: LucideBuilding,
  people: LucideUsersRound,
  goverment: LucideLandmark,
} as const;

type AffectedPartyItemProps = {
  party: Extract<JudgeCase["sections"][number]["blocks"][number], { type: "with_icon_list_item" }>;
  entities: JudgeCase["entities"];
};

export function AffectedPartyItem({ party, entities }: AffectedPartyItemProps) {
  const Icon = iconByStorageType[party.with_icon_list_item.icon];

  return (
    <div className="flex items-start gap-[14px]">
      <Icon
        className="mt-1 h-4 w-4 shrink-0 text-neutral-900"
        strokeWidth={1.8}
        aria-hidden="true"
      />
      <span className="text-[16px] leading-[1.6] tracking-[0.02em] text-neutral-900">
        {richTextToMarkdown(party.with_icon_list_item.rich_text, entities)}
      </span>
    </div>
  );
}

export default function AffectedParties({ parties, entities }: AffectedPartiesProps) {
  return (
    <section className="space-y-[18px]">
      <h2 className="text-[11px] font-medium whitespace-nowrap text-neutral-600">
        影響を受ける主体
      </h2>
      <ul className="space-y-[14px]">
        {parties.map((party, index) => {
          return (
            <li key={index}>
              <AffectedPartyItem party={party} entities={entities} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
