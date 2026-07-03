import { Link } from "../Link";
import type { JudgeCase } from "../../data/judges";

type CaseMetadataProps = {
  judgeCase: JudgeCase;
};

export default function CaseMetadata({ judgeCase }: CaseMetadataProps) {
  return (
    <section className="space-y-[18px] text-[14px]">
      <div className="grid grid-cols-2 gap-[18px]">
        <MetaField label="種別">
          <Link href="#">{judgeCase.kind}</Link>
        </MetaField>
        <MetaField label="結果">
          <Link href="#">{judgeCase.result}</Link>
        </MetaField>
      </div>
      <MetaField label="主文">{judgeCase.order}</MetaField>
      <Divider />
      <MetaField label="事件名">{judgeCase.caseName}</MetaField>
      <MetaField label="事件番号">{judgeCase.caseNumber}</MetaField>
      <MetaField label="法廷">{judgeCase.court}</MetaField>
      <MetaField label="判例符号">
        <Link href="#">{judgeCase.codeDescription}</Link>
      </MetaField>
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
