import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { LucideArrowRight, LucideBookOpen, LucideCircleHelp, LucideLink2, LucideMessageCircle } from "lucide-react";
import { useState, type FormEvent } from "react";

import GuidedReadingExperience from "../features/guided-reading/GuidedReadingExperience";
import { deleteReadingSource, importReadingSource, type ReadingSource } from "../features/guided-reading/api-client";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
  const [source, setSource] = useState<ReadingSource | null>(null);
  const importMutation = useMutation({ mutationFn: importReadingSource, retry: false });
  const deleteMutation = useMutation({ mutationFn: deleteReadingSource, retry: false });

  async function start(url: string) {
    importMutation.reset();
    try {
      setSource(await importMutation.mutateAsync(url));
    } catch {}
  }

  function exit() {
    const sourceId = source?.sourceId;
    setSource(null);
    if (sourceId) deleteMutation.mutate(sourceId);
  }

  if (source) return <GuidedReadingExperience source={source} onExit={exit} />;

  return (
    <main>
      <Hero onStart={start} loading={importMutation.isPending} error={importMutation.error?.message ?? ""} onClearError={() => importMutation.reset()} />
      <GuidedFlow />
      <ExperienceNote />
    </main>
  );
}

function Hero({ onStart, loading, error, onClearError }: {
  onStart: (url: string) => Promise<void>;
  loading: boolean;
  error: string;
  onClearError: () => void;
}) {
  const [url, setUrl] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    void onStart(url.trim());
  }

  return (
    <section id="try" className="overflow-hidden bg-[#f7f9ff] px-5 py-16 md:py-24">
      <div className="mx-auto grid max-w-[1160px] items-center gap-14 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-20">
        <div>
          <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#e7edff] px-3 py-1.5 text-xs font-medium text-recourt-brandblue"><span className="h-1.5 w-1.5 rounded-full bg-recourt-brandblue" />対話型の読解を検証中</p>
          <h1 className="max-w-[680px] text-[clamp(2.5rem,5vw,4.6rem)] leading-[1.3] font-semibold tracking-tight text-recourt-brandblue">気になった記事を、<br />対話で読み解く。</h1>
          <p className="mt-7 max-w-[600px] text-base leading-[2] text-[#3d4b6c] md:text-lg">ニュースで引っかかった言葉や判断を、そのまま質問してください。記事を一緒に読みながら、必要なところから少しずつ説明します。</p>
          <form onSubmit={submit} className="mt-10 max-w-[640px]">
            <label htmlFor="news-url" className="mb-2 block text-sm font-medium text-[#27365c]">記事のURLから始める</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-[#cbd8f4] bg-white px-4 focus-within:border-recourt-brandblue focus-within:ring-2 focus-within:ring-[#dce5ff]">
                <LucideLink2 className="h-5 w-5 shrink-0 text-[#7280a2]" aria-hidden="true" />
                <input id="news-url" type="url" required pattern="https://.*" maxLength={2_048} value={url} onChange={(event) => { setUrl(event.target.value); onClearError(); }} placeholder="https://example.com/article" aria-describedby="url-help url-error" className="h-14 min-w-0 flex-1 border-0 bg-transparent text-sm text-[#1d2b4f] outline-none placeholder:text-[#7784a1]" />
              </div>
              <button type="submit" disabled={loading} className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-recourt-brandblue px-6 text-sm font-medium whitespace-nowrap text-white hover:bg-[#1523a0] disabled:cursor-wait disabled:opacity-70">
                {loading ? "記事を読み込んでいます…" : "読み解きはじめる"} {!loading ? <LucideArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
              </button>
            </div>
            <p id="url-help" className="mt-3 text-xs leading-relaxed text-[#657391]">公開されたHTTPSの記事に対応します。会員限定の記事やアクセス制限のあるサイトは取り込めない場合があります。</p>
            {error ? <p id="url-error" role="alert" className="mt-3 rounded-lg bg-[#fff1ee] px-3 py-2 text-sm text-[#a13c34]">{error}</p> : null}
          </form>
        </div>
        <ConversationPreview />
      </div>
    </section>
  );
}

function ConversationPreview() {
  return (
    <div aria-label="対話体験のイメージ" className="rounded-2xl border border-[#dbe4f8] bg-white p-4 shadow-[0_28px_70px_rgba(0,9,103,0.10)] sm:p-6">
      <div className="flex items-center gap-3 border-b border-[#e8edfa] pb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e9efff] text-recourt-brandblue"><LucideMessageCircle className="h-5 w-5" aria-hidden="true" /></div>
        <div><p className="text-xs font-medium text-[#61708f]">再考裁との対話</p><p className="text-sm font-semibold text-recourt-brandblue">自分の疑問から読み進める</p></div>
      </div>
      <div className="space-y-4 py-6">
        <p className="ml-auto max-w-[84%] rounded-2xl rounded-tr-sm bg-[#eaf0ff] px-4 py-3 text-sm leading-[1.8] text-[#203872]">この記事の「違法」という言葉は、どういう意味ですか？</p>
        <div className="flex items-start gap-2"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-recourt-brandblue text-xs font-semibold text-white">再</span><p className="rounded-2xl rounded-tl-sm bg-[#f1f5ff] px-4 py-3 text-sm leading-[1.8] text-[#263759]">まず、記事が何を「違法」と呼んでいるのかを分けて見てみましょう。</p></div>
      </div>
      <div className="rounded-xl border border-[#dbe4f8] bg-[#fbfcff] p-4"><p className="text-xs font-semibold text-recourt-brandblue">記事を出発点に</p><p className="mt-2 text-xs leading-relaxed text-[#566581]">元の記事へのリンクを確認しながら話せます。判決本文はこの段階では確認していません。</p></div>
    </div>
  );
}

function GuidedFlow() {
  const steps = [
    { icon: LucideLink2, number: "01", title: "記事を持ち込む", description: "気になった公開記事のURLを貼り付けます。" },
    { icon: LucideCircleHelp, number: "02", title: "自分の言葉で聞く", description: "質問がまとまっていなくても大丈夫。気になったところから話せます。" },
    { icon: LucideBookOpen, number: "03", title: "記事を確かめながら進む", description: "説明が難しければ、言い換えや具体例を頼めます。" },
  ];
  return (
    <section className="px-5 py-18 md:py-24" aria-labelledby="flow-heading"><div className="mx-auto max-w-[1160px]">
      <p className="text-xs font-medium tracking-widest text-recourt-brandblue">HOW IT WORKS</p>
      <h2 id="flow-heading" className="mt-3 text-2xl font-semibold text-[#1d2b4f] md:text-3xl">一度に全部、読む必要はありません。</h2>
      <div className="mt-9 grid gap-4 md:grid-cols-3">{steps.map(({ icon: Icon, number, title, description }) => (
        <div key={number} className="rounded-2xl border border-[#e4eafa] bg-white p-6"><div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf2ff] text-recourt-brandblue"><Icon className="h-5 w-5" aria-hidden="true" /></span><span className="text-sm font-medium text-[#a1afd2]">{number}</span></div><h3 className="mt-6 text-lg font-semibold text-[#1d2b4f]">{title}</h3><p className="mt-3 text-sm leading-[1.9] text-[#536183]">{description}</p></div>
      ))}</div>
    </div></section>
  );
}

function ExperienceNote() {
  return (
    <section className="bg-[#f7f9ff] px-5 py-14" aria-labelledby="experience-heading"><div className="mx-auto max-w-[1160px] rounded-2xl border border-[#dce5fa] bg-white p-7 md:p-10">
      <p className="text-xs font-medium text-recourt-brandblue">現在は体験検証中</p>
      <h2 id="experience-heading" className="mt-3 text-xl font-semibold text-[#1d2b4f]">記事から始める、開かれた入口を。</h2>
      <p className="mt-3 max-w-[760px] text-sm leading-[1.9] text-[#536183]">記事の内容をもとにAIと会話できます。この画面の会話履歴は再読み込み後に消えます。対応する判決を探して原文と照らし合わせる機能は、今後の開発対象です。</p>
    </div></section>
  );
}
