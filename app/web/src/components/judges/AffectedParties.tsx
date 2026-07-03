import { LucideBuilding, LucideLandmark, LucideUsersRound } from "lucide-react";
import type { AffectedParty } from "../../data/judges";

type AffectedPartiesProps = {
  parties: Array<AffectedParty>;
};

const iconByType = {
  building: LucideBuilding,
  users: LucideUsersRound,
  landmark: LucideLandmark,
} satisfies Record<AffectedParty["icon"], typeof LucideBuilding>;

export default function AffectedParties({ parties }: AffectedPartiesProps) {
  return (
    <section className="space-y-[18px]">
      <h2 className="text-[11px] font-medium whitespace-nowrap text-neutral-600">
        影響を受ける主体
      </h2>
      <ul className="space-y-[14px]">
        {parties.map((party) => {
          const Icon = iconByType[party.icon];

          return (
            <li key={party.label} className="flex items-start gap-[14px]">
              <Icon
                className="mt-1 h-4 w-4 shrink-0 text-neutral-900"
                strokeWidth={1.8}
                aria-hidden="true"
              />
              <span className="text-[16px] leading-[1.6] tracking-[0.02em] text-neutral-900">
                {party.label}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
