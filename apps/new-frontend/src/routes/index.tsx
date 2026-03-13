import { createFileRoute, Link as TanStackLink } from "@tanstack/react-router";
import {
  LucideBot,
  LucideHatGlasses,
  LucideScale,
  LucideSquareArrowOutUpRight,
  LucideX,
} from "lucide-react";
import { BasicBaseLayout } from "@/components/ui/base-layout";
import { Link } from "@/components/ui/link";

export const Route = createFileRoute("/")({ component: App });

function App() {
  return (
    <BasicBaseLayout>
      <div className="flex-1 flex flex-col gap-18">
        <div className="grid grid-cols-2 gap-16 items-center">
          <div>
            <h1 className="text-4xl leading-relaxed tracking-wide font-bold">
              最高裁判所をもっと身近に、
              <br />
              もっとわかりやすく。
            </h1>
            <div className="flex mt-8">
              <TanStackLink to="/cases">
                <button
                  type="button"
                  className="bg-blue-800 hover:bg-blue-900 text-white font-bold px-6 py-4 rounded-xl cursor-pointer"
                >
                  判例を見てみる
                </button>
              </TanStackLink>
              <button
                type="button"
                className="ml-4 border hover:bg-neutral-100 border-neutral-400 hover:border-neutral-800 font-bold rounded-xl px-6 py-4 cursor-pointer flex items-center gap-2"
              >
                <span>GitHub</span>
                <LucideSquareArrowOutUpRight className="size-4" />
              </button>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-8">
              <LucideHatGlasses className="size-24" />
              <LucideX className="size-6 text-neutral-500" />
              <LucideScale className="size-24" />
              <LucideX className="size-6 text-neutral-500" />
              <LucideBot className="size-24" />
            </div>
          </div>
        </div>
        <div className="border border-neutral-400 rounded-3xl h-48 p-12 flex gap-12 items-center">
          <h2 className="font-bold">お知らせ</h2>
          <div className="bg-neutral-200 h-full w-0.5" />
        </div>
        <div>
          <h2 className="text-4xl leading-relaxed tracking-wide font-bold mb-6">再考裁について</h2>
          <p className="leading-loose">
            再考裁は
            <Link href="https://tuki.dev">つきみん</Link>
            によって開発された、最高裁判所の判例をわかりやすく解説するためのサービスです。
            <br />
            当時18歳で選挙権を取得した時の記念に作成され、今もメンテナンスされています。
          </p>
        </div>
        <div>
          <h2 className="text-4xl leading-relaxed tracking-wide font-bold mb-6">公平性について</h2>
          <p className="leading-loose mb-6">
            再考裁は
            <Link href="https://github.com/tukiminya/recourt">GitHub</Link>
            上でソースコードを公開しており、誰でもコードを確認することができます。
            <br />
            判例の解説は、最高裁判所が公開している判例要旨をもとに、AIが自動生成しています。
          </p>
          <div className="border border-yellow-500 rounded-3xl p-8 flex gap-12 items-center overflow-hidden bg-yellow-50">
            <h2 className="font-bold">ご利用上の注意点</h2>
            <div>
              生成AIの特性上、各種情報は不十分な可能性があります。必ず判例の本文を読むなどしてください。
            </div>
          </div>
        </div>
      </div>
    </BasicBaseLayout>
  );
}
