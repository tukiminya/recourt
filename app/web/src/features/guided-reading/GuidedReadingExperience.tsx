import { LucideArrowLeft, LucideExternalLink, LucideFileText, LucideSend } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";

import { ReadingRequestError, streamChat, type ConversationMessage, type ReadingSource } from "./api-client";

type GuidedReadingExperienceProps = {
  source: ReadingSource;
  onExit: () => void;
};

export default function GuidedReadingExperience({ source, onExit }: GuidedReadingExperienceProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [partialAnswer, setPartialAnswer] = useState("");
  const [input, setInput] = useState("");
  const chatMutation = useMutation({
    mutationFn: ({ messages, onDelta, signal }: { messages: ConversationMessage[]; onDelta: (text: string) => void; signal: AbortSignal }) =>
      streamChat(source.sourceId, messages, onDelta, signal),
    retry: false,
  });
  const busy = chatMutation.isPending;
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const busyRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const limitReached = messages.length >= 20;

  useEffect(() => {
    const remaining = new Date(source.expiresAt).getTime() - Date.now();
    if (remaining <= 0) {
      setExpired(true);
      return;
    }
    const timer = window.setTimeout(() => setExpired(true), remaining);
    return () => window.clearTimeout(timer);
  }, [source.expiresAt]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pendingQuestion, partialAnswer, error]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function sendQuestion(question: string) {
    if (busyRef.current || expired || limitReached || !question.trim()) return;
    busyRef.current = true;
    setError("");
    setPendingQuestion(question);
    setPartialAnswer("");
    setInput("");
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const answer = await chatMutation.mutateAsync({
        messages: [...messages, { role: "user", content: question }],
        onDelta: setPartialAnswer,
        signal: controller.signal,
      });
      setMessages([...messages, { role: "user", content: question }, { role: "assistant", content: answer }]);
      setPendingQuestion(null);
      setPartialAnswer("");
    } catch (cause) {
      if (controller.signal.aborted) return;
      if (cause instanceof ReadingRequestError && cause.status === 410) setExpired(true);
      setError(cause instanceof Error ? cause.message : "返答を受信できませんでした。もう一度お試しください。");
    } finally {
      busyRef.current = false;
      abortRef.current = null;
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingQuestion) return;
    void sendQuestion(input.trim());
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  function leave() {
    abortRef.current?.abort();
    onExit();
  }

  return (
    <main className="min-h-[calc(100vh-72px)] bg-[#f7f9ff] px-4 py-5 md:px-6 md:py-8">
      <div className="mx-auto max-w-[960px]">
        <button type="button" onClick={leave} className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-recourt-brandblue hover:underline">
          <LucideArrowLeft className="h-4 w-4" aria-hidden="true" /> 新しい記事を選ぶ
        </button>

        <section aria-label="記事についての対話" className="flex min-h-[630px] flex-col overflow-hidden rounded-2xl border border-[#dce5fa] bg-white shadow-[0_16px_48px_rgba(0,9,103,0.06)] lg:h-[calc(100vh-170px)]">
          <SourceHeader source={source} />

          <div className="min-h-[350px] flex-1 space-y-6 overflow-y-auto px-4 py-6 sm:px-8">
            {messages.length === 0 ? <StartingPoint source={source} /> : null}
            {messages.map((message, index) => <ChatTurn key={index} message={message} />)}
            {pendingQuestion ? <ChatTurn message={{ role: "user", content: pendingQuestion }} /> : null}
            {partialAnswer ? <ChatTurn message={{ role: "assistant", content: partialAnswer }} /> : null}
            {busy && !partialAnswer ? <p role="status" className="pl-12 text-sm text-[#667696]">記事を確認しながら返答しています…</p> : null}
            {error ? (
              <div role="alert" className="rounded-xl border border-[#f4d5d3] bg-[#fff8f7] p-4 text-sm text-[#9c3835]">
                <p>{error}</p>
                {pendingQuestion && !expired ? (
                  <div className="mt-3 flex flex-wrap gap-4">
                    <button type="button" onClick={() => { if (pendingQuestion) void sendQuestion(pendingQuestion); }} className="font-medium underline">もう一度送る</button>
                    <button type="button" onClick={() => { setInput(pendingQuestion); setPendingQuestion(null); setPartialAnswer(""); setError(""); }} className="font-medium underline">質問を編集する</button>
                  </div>
                ) : null}
              </div>
            ) : null}
            <div ref={threadEndRef} />
          </div>

          <div className="border-t border-[#e8edfa] bg-[#fcfdff] px-4 py-4 sm:px-8">
            {expired || limitReached ? (
              <div className="rounded-xl bg-[#eef3ff] p-4 text-sm text-[#30426f]">
                {expired ? "記事の利用時間が終わりました。URLから新しい会話を始めてください。" : "この会話はここまでです。続ける場合は、記事のURLから新しい会話を始めてください。"}
                <button type="button" onClick={leave} className="ml-2 font-semibold text-recourt-brandblue underline">記事を選ぶ</button>
              </div>
            ) : (
              <form onSubmit={submit} className="flex items-end gap-2">
                <label htmlFor="reader-message" className="sr-only">記事について質問する</label>
                <textarea
                  id="reader-message"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={onInputKeyDown}
                  rows={2}
                  maxLength={2_000}
                  disabled={busy || pendingQuestion !== null}
                  placeholder="わからないことや、気になったことを聞いてください"
                  className="max-h-40 min-h-14 min-w-0 flex-1 resize-y rounded-xl border border-[#cfdbf7] bg-white px-4 py-3 text-sm leading-relaxed text-[#1d2b4f] outline-none placeholder:text-[#7784a1] focus:border-recourt-brandblue focus:ring-2 focus:ring-[#dce5ff] disabled:opacity-60"
                />
                <button type="submit" disabled={busy || pendingQuestion !== null || !input.trim()} aria-label="メッセージを送信" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-recourt-brandblue text-white hover:bg-[#1523a0] disabled:cursor-not-allowed disabled:opacity-40">
                  <LucideSend className="h-5 w-5" aria-hidden="true" />
                </button>
              </form>
            )}
            <p className="mt-3 text-xs leading-relaxed text-[#7a87a1]">この画面の会話履歴は再読み込み後に消えます。記事の内容は参考資料として扱い、判決本文は確認していません。</p>
          </div>
        </section>
      </div>
    </main>
  );
}

function SourceHeader({ source }: { source: ReadingSource }) {
  return (
    <header className="border-b border-[#e8edfa] px-4 py-4 sm:px-8">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ebf1ff] text-recourt-brandblue"><LucideFileText className="h-5 w-5" aria-hidden="true" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-[#546383]">取り込んだ記事 <span className="ml-2 rounded-full bg-[#fff3d8] px-2 py-0.5 text-[#7a571b]">判決は未確認</span></p>
          <h1 className="mt-2 text-lg leading-snug font-semibold text-recourt-brandblue sm:text-xl">{source.title}</h1>
          <a href={source.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-recourt-brandblue underline underline-offset-2 hover:text-[#3343ae]">
            元記事を開く <LucideExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </header>
  );
}

function StartingPoint({ source }: { source: ReadingSource }) {
  return (
    <div className="max-w-[620px] rounded-2xl border border-[#dce5fa] bg-[#f8faff] p-5 sm:p-6">
      <p className="text-xs font-semibold text-recourt-brandblue">この記事について話しましょう</p>
      <p className="mt-3 text-sm leading-[1.85] text-[#34405e]">{source.excerpt}{source.excerpt.length >= 240 ? "…" : ""}</p>
      <p className="mt-4 text-sm leading-[1.85] text-[#536183]">どこが気になりましたか？ 疑問がまとまっていなくても、そのまま書いてください。</p>
    </div>
  );
}

function ChatTurn({ message }: { message: ConversationMessage }) {
  if (message.role === "user") {
    return <div className="flex justify-end"><p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-[#eaf0ff] px-4 py-3 text-sm leading-[1.9] text-[#142b6b]">{message.content}</p></div>;
  }
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-recourt-brandblue text-sm font-semibold text-white">再</div>
      <div className="prose prose-sm max-w-[90%] rounded-2xl rounded-tl-sm bg-[#f1f5ff] px-4 py-3 leading-[1.9] text-[#1d2b4f] prose-a:text-recourt-brandblue prose-p:my-2">
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>
    </div>
  );
}
