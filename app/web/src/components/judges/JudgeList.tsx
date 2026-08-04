import type { Judge } from "../../data/judges";
import Label from "../Label";

type JudgeListProps = {
  judges: Array<Judge>;
};

export default function JudgeList({ judges }: JudgeListProps) {
  const chief = judges.find((judge) => judge.role === "裁判長");
  const associates = judges.filter((judge) => judge.role !== "裁判長");

  return (
    <section className="space-y-[18px]">
      {chief ? <JudgeGroup label="裁判長" judges={[chief]} showRoleBadge /> : null}
      {associates.length > 0 ? <JudgeGroup label="裁判官" judges={associates} /> : null}
    </section>
  );
}

function JudgeGroup({
  label,
  judges,
  showRoleBadge = false,
}: {
  label: string;
  judges: Array<Judge>;
  showRoleBadge?: boolean;
}) {
  return (
    <div className="space-y-[5px]">
      <h2 className="text-[11px] font-normal text-neutral-600">{label}</h2>
      <ul>
        {judges.map((judge) => (
          <li key={judge.name} className="flex h-[38px] items-center gap-[10px] rounded-lg py-1.5">
            <span className="text-[14px] font-medium whitespace-nowrap text-neutral-900">
              {judge.name}
            </span>
            <Label tone="success">{judge.opinion}</Label>
            {showRoleBadge ? <Label tone="brand">{judge.role}</Label> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
