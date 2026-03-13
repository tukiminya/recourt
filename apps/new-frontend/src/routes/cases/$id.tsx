import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { BasicBaseLayout, GridSystem } from "@/components/ui/base-layout";
import { Link } from "@/components/ui/link";
import { Section, SectionTitle } from "@/components/ui/section";

export const Route = createFileRoute("/cases/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <BasicBaseLayout>
      <GridSystem>
        <div className="col-span-9">
          <section>
            <p className="text-neutral-700 mb-2 font-medium">離婚等請求事件</p>
            <h1 className="text-3xl font-bold">
              離婚等請求事件における最高裁判所への直接提訴の却下
            </h1>
          </section>
          <hr className="border border-neutral-100 my-12" />
          <Section className="">
            <SectionTitle>主文</SectionTitle>
            <p className="font-semibold text-2xl">
              本件訴えを却下する。訴訟費用は原告の負担とする。
            </p>
          </Section>
          <hr className="border border-neutral-100 my-12" />
          <div className="grid grid-cols-2 gap-8 read-area">
            <Section>
              <SectionTitle>概要</SectionTitle>
              <p>
                最高裁判所に第一審としての離婚訴訟を提起した事案において、裁判所は、管轄権がないことを認識しながら不当な目的で提訴された訴えは訴訟上の信義則に反すると判断し、民事訴訟法317条1項を類推適用して訴えを却下した。
              </p>
            </Section>
            <Section>
              <SectionTitle>背景</SectionTitle>
              <p>
                原告は、弁護士を代理人として「最高裁判所」を提出先とする離婚等の訴状を最高裁に提出した。訴状には仙台家庭裁判所への移送を求める記載があったが、仙台家裁に管轄がある根拠はなく、また、印紙の貼付や郵券の予納もされていなかった。代理人弁護士は過去にも同様の行為を繰り返していた。
              </p>
            </Section>
            <Section>
              <SectionTitle>争点</SectionTitle>
              <ul>
                <li>
                  ☝️
                  最高裁判所に管轄のない第一審訴訟が直接提起された場合、裁判所はこれを管轄裁判所に移送すべきか、あるいは却下できるか。
                </li>
              </ul>
            </Section>
          </div>
        </div>
        <div className="col-span-3 border-l-2 border-l-neutral-100 px-6 py-4 flex flex-col gap-6 font-medium">
          <MetaDataSection title="裁判種別">
            <p>決定</p>
          </MetaDataSection>
          <MetaDataSection title="裁判結果">
            <p>却下</p>
          </MetaDataSection>
          <MetaDataSection title="事件番号">
            <p>令和7(マ)244</p>
          </MetaDataSection>
          <MetaDataSection title="判決日">
            <p>2026年1月28日（12日前）</p>
          </MetaDataSection>
          <MetaDataSection title="関連する法律（e-govに移動します）">
            <Link href="">民事訴訟法</Link>
          </MetaDataSection>
          <MetaDataSection title="関連するURL">
            <Link href="">判例の本文</Link>
          </MetaDataSection>
          <MetaDataSection title="">a</MetaDataSection>
        </div>
      </GridSystem>
    </BasicBaseLayout>
  );
}

function MetaDataSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <span className="text-neutral-600 mb-1 text-xs font-normal block">{title}</span>
      {children}
    </section>
  );
}
