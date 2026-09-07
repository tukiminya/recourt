import { Link } from "../Link";
import type { CaseEntity } from "../../data/judges";

type CaseMetadataProps = {
  caseEntity?: CaseEntity;
};

export default function CaseMetadata({ caseEntity }: CaseMetadataProps) {
  return (
    <section className="space-y-[18px] text-[14px]">
      <MetaField label="事件名">{caseEntity?.title ?? "—"}</MetaField>
      <MetaField label="事件番号">{caseEntity?.case_number ?? "—"}</MetaField>
      <MetaField label="法廷">{caseEntity?.court ?? "—"}</MetaField>
      <MetaField label="裁判日">{caseEntity?.decision_date ?? "—"}</MetaField>
      {caseEntity?.url ? (
        <MetaField label="出典">
          <Link href={caseEntity.url}>裁判所の公式情報</Link>
        </MetaField>
      ) : null}
      <Divider />
    </section>
  );
}

function MetaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-[5px]">
      <dt className="text-[11px] leading-normal text-neutral-600">{label}</dt>
      <dd className="m-0 text-[14px] leading-normal text-neutral-900">{children}</dd>
    </div>
  );
}

function Divider() {
  return <div className="h-px w-full bg-neutral-200" />;
}
