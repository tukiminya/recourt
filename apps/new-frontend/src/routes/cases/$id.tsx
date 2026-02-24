import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@/components/ui/link";
import { Section, SectionTitle } from "@/components/ui/section";

export const Route = createFileRoute("/cases/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="min-h-screen flex p-10 pt-32 max-w-500 mx-auto">
      <div className="pr-10">
        <div className="mb-18">
          <section className="mb-12">
            <p className="text-lg text-neutral-700 mb-2">離婚等請求事件</p>
            <h1 className="text-4xl font-medium">
              離婚等請求事件における最高裁判所への直接提訴の却下
            </h1>
          </section>
          <div className="grid grid-cols-2 gap-14">
            <Section>
              <SectionTitle>裁判結果</SectionTitle>
              <div className="inline-block mr-8">
                <span className="text-neutral-600 font-medium mr-2">種別</span>
                <span className="font-bold text-3xl">決定</span>
              </div>
              <div className="inline-block">
                <span className="text-neutral-600 font-medium mr-2">結果</span>
                <span className="font-bold text-3xl">却下</span>
              </div>
            </Section>
            <Section>
              <SectionTitle>主文</SectionTitle>
              <p className="font-medium text-xl">
                本件訴えを却下する。訴訟費用は原告の負担とする。
              </p>
            </Section>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-14 read-area">
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
      <div className="shrink-0 min-w-72 border-l-2 border-l-neutral-100 px-10 py-6 flex flex-col gap-8">
        <section>
          <span className="text-neutral-700 pb-2">事件番号</span>
          <p className="text-xl font-semibold">令和7(マ)244</p>
        </section>
        <section>
          <span className="text-neutral-700 pb-2">判決日</span>
          <p className="text-xl font-semibold">2026年1月28日（12日前）</p>
        </section>
        <section>
          <span className="text-neutral-700 pb-2">関連する法律（e-govに移動します）</span>
          <p className="font-semibold">
            <Link href="">民事訴訟法</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
