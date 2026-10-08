import { Link } from "@tanstack/react-router";
import { LucideArrowLeft, LucideFileText, LucideMessageCircle, LucideSend } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { readingParagraph, type ReadingCase, type ReadingParagraph } from "@recourt/types";
import { z } from "zod";
import Label from "../../components/Label";
import { caseApiBaseUrl, chatAboutCase, explainCase } from "./api-client";

type Section = "overview" | "background" | "issue" | "reason";
type Depth = "short" | "standard" | "detailed";
const sections: { key: Section; label: string; title: string }[] = [
  { key: "overview", label: "全体像", title: "この裁判で確かめること" },
  { key: "background", label: "背景", title: "何があった？" },
  { key: "issue", label: "争点", title: "何が争われた？" },
  { key: "reason", label: "判断理由", title: "なぜそう判断した？" },
];
const historySchema = z
  .array(
    z.discriminatedUnion("role", [
      z.object({ role: z.literal("user"), content: z.string().max(2_000) }),
      z.object({
        role: z.literal("assistant"),
        content: z.string().max(4_000),
        paragraphs: readingParagraph.array(),
      }),
    ]),
  )
  .max(20);
type Message = z.infer<typeof historySchema>[number];
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "生成に失敗しました。もう一度お試しください。";

export default function CaseReadingExperience({
  courtCase,
  topics,
}: {
  courtCase: ReadingCase;
  topics: string;
}) {
  const [section, setSection] = useState<Section>("overview");
  const [depth, setDepth] = useState<Depth>("standard");
  const [paragraphs, setParagraphs] = useState<ReadingParagraph[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const chatAbort = useRef<AbortController | null>(null);
  const cache = useRef(new Map<string, ReadingParagraph[]>());
  useEffect(() => {
    chatAbort.current?.abort();
    const controller = new AbortController();
    const key = `${section}:${depth}`;
    const cached = cache.current.get(key);
    setParagraphs(cached ?? []);
    setError("");
    setLoading(!cached);
    if (!cached) {
      void explainCase(
        courtCase,
        { documentId: courtCase.documentId, section, depth },
        (paragraph) => {
          if (!controller.signal.aborted) setParagraphs((current) => [...current, paragraph]);
        },
        controller.signal,
      )
        .then((result) => {
          if (!controller.signal.aborted) cache.current.set(key, result);
        })
        .catch((reason: unknown) => {
          if (!controller.signal.aborted) setError(errorMessage(reason));
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }
    return () => controller.abort();
  }, [courtCase, section, depth, retry]);
  useEffect(
    () => () => {
      chatAbort.current?.abort();
    },
    [],
  );

  return (
    <section
      aria-label="選んだ裁判を一緒に読む"
      className="min-h-[calc(100vh-72px)] bg-[#f7f9ff] px-4 py-5 md:px-6 md:py-8"
    >
      <div className="mx-auto max-w-[1160px]">
        <Link
          to="/"
          search={{ topics }}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-recourt-brandblue hover:underline"
        >
          <LucideArrowLeft className="h-4 w-4" aria-hidden="true" />
          裁判の一覧に戻る
        </Link>
        <div className="overflow-hidden rounded-2xl border border-[#dce5fa] bg-white shadow-[0_16px_48px_rgba(0,9,103,0.06)]">
          <header className="border-b border-[#e8edfa] px-5 py-5 sm:px-8">
            <div className="flex flex-wrap gap-1.5">
              {courtCase.topics.map((topic) => (
                <Label key={topic.id} tone="brand">
                  {topic.label}
                </Label>
              ))}
            </div>
            <h1 className="mt-3 text-2xl leading-snug font-semibold text-recourt-brandblue sm:text-3xl">
              {courtCase.title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#536183]">{courtCase.description}</p>
            <p className="mt-3 text-xs text-[#657391]">
              {courtCase.courtName} · {courtCase.decisionDate ?? "裁判日不明"} ·{" "}
              {courtCase.caseNumber}
            </p>
            <a
              href={courtCase.detailUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs text-recourt-brandblue underline"
            >
              裁判所の公開情報
            </a>
          </header>
          <div className="grid lg:grid-cols-[minmax(0,1fr)_350px]">
            <article className="min-w-0 px-5 py-6 sm:px-8 sm:py-8">
              <nav className="flex flex-wrap gap-2" aria-label="裁判の内容">
                {sections.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    aria-current={section === item.key ? "true" : undefined}
                    onClick={() => setSection(item.key)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${section === item.key ? "bg-recourt-brandblue text-white" : "bg-[#eef3ff] text-[#536183] hover:bg-[#dfe8ff]"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
              <div className="mt-9 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold tracking-widest text-recourt-brandblue">
                  一緒に読む
                </p>
                <div
                  className="inline-flex gap-1 rounded-lg bg-[#eef3ff] p-1"
                  role="group"
                  aria-label="説明の詳しさ"
                >
                  {(["short", "standard", "detailed"] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      aria-pressed={depth === level}
                      onClick={() => setDepth(level)}
                      className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${depth === level ? "bg-white text-recourt-brandblue shadow-sm" : "text-[#657391]"}`}
                    >
                      {{ short: "短く", standard: "標準", detailed: "詳しく" }[level]}
                    </button>
                  ))}
                </div>
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-[#1d2b4f]">
                {sections.find((item) => item.key === section)!.title}
              </h2>
              <div className="mt-5 min-h-40 space-y-5" aria-live="polite" aria-busy={loading}>
                {paragraphs.map((paragraph, index) => (
                  <EvidenceParagraph
                    key={`${section}:${depth}:${retry}:${index}`}
                    paragraph={paragraph}
                  />
                ))}
                {loading && (
                  <p className="text-sm text-[#657391]">
                    判決本文を確かめながら説明を作っています…
                  </p>
                )}
              </div>
              {error && (
                <RetryError message={error} retry={() => setRetry((current) => current + 1)} />
              )}
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#dbe4f8] bg-[#f8faff] p-4">
                <LucideFileText
                  className="mt-0.5 h-4 w-4 shrink-0 text-recourt-brandblue"
                  aria-hidden="true"
                />
                <p className="text-xs leading-[1.8] text-[#536183]">
                  「根拠」を押すと、説明に対応する原文とPDFのページを確認できます。AIの説明は原文と照らし合わせながら読んでください。
                </p>
              </div>
            </article>
            <CaseConversation
              key={courtCase.documentId}
              courtCase={courtCase}
              section={section}
              depth={depth}
              abortRef={chatAbort}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export function EvidenceParagraph({ paragraph }: { paragraph: ReadingParagraph }) {
  const [active, setActive] = useState<string | null>(null);
  const source = paragraph.citations.find((citation) => citation.passageId === active);
  return (
    <div className="text-sm leading-[2] text-[#34405e]">
      {paragraph.kind !== "judgment" && (
        <p className="mb-1 text-[10px] font-medium text-[#657391]">
          {paragraph.kind === "explanation" ? "用語の説明" : "本文で確認できないこと"}
        </p>
      )}
      <p className="whitespace-pre-wrap">{paragraph.text}</p>
      {paragraph.citations.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {paragraph.citations.map((citation) => (
            <button
              key={citation.passageId}
              type="button"
              aria-expanded={active === citation.passageId}
              onClick={() => setActive(active === citation.passageId ? null : citation.passageId)}
              className="rounded-full border border-[#d7e1f6] px-2 py-0.5 text-xs text-recourt-brandblue hover:bg-[#edf2ff]"
            >
              根拠 · {citation.page}ページ
            </button>
          ))}
        </div>
      )}
      {source && (
        <div className="mt-3 rounded-xl border border-[#dbe4f8] bg-[#f8faff] p-3">
          <p className="mb-2 text-xs font-semibold">判決原文 · {source.page}ページ</p>
          <blockquote className="max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-[1.9]">
            {source.excerpt}
          </blockquote>
          <a
            href={new URL(source.pdfUrl, caseApiBaseUrl).href}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-xs text-recourt-brandblue underline"
          >
            PDFの該当ページを開く
          </a>
        </div>
      )}
    </div>
  );
}

function RetryError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-800">
      <p>{message}</p>
      <button type="button" onClick={retry} className="mt-2 font-semibold underline">
        もう一度試す
      </button>
    </div>
  );
}

function CaseConversation({
  courtCase,
  section,
  depth,
  abortRef,
}: {
  courtCase: ReadingCase;
  section: Section;
  depth: Depth;
  abortRef: React.MutableRefObject<AbortController | null>;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<{
    question: string;
    paragraphs: ReadingParagraph[];
  } | null>(null);
  const [error, setError] = useState("");
  const [failedQuestion, setFailedQuestion] = useState("");
  const conversationScroll = useRef<HTMLDivElement | null>(null);
  const followLatest = useRef(true);
  const key = `recourt:case:${courtCase.documentId}`;
  useEffect(() => {
    try {
      const result = historySchema.safeParse(JSON.parse(sessionStorage.getItem(key) ?? "[]"));
      if (
        result.success &&
        result.data.every(
          (message, index) => message.role === (index % 2 === 0 ? "user" : "assistant"),
        ) &&
        result.data.length % 2 === 0
      )
        setMessages(result.data);
    } catch {
      /* A blocked browser store does not prevent reading. */
    }
    setLoaded(true);
  }, [key]);
  useEffect(() => {
    if (loaded) {
      try {
        sessionStorage.setItem(key, JSON.stringify(messages));
      } catch {
        /* Keep the conversation in memory. */
      }
    }
  }, [key, loaded, messages]);
  useEffect(() => {
    const element = conversationScroll.current;
    if (element && followLatest.current) element.scrollTop = element.scrollHeight;
  }, [messages, pending]);
  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || abortRef.current || !loaded) return;
    const controller = new AbortController();
    followLatest.current = true;
    abortRef.current = controller;
    setInput("");
    setError("");
    setFailedQuestion("");
    setPending({ question: trimmed, paragraphs: [] });
    const history = messages.slice(-18);
    try {
      const result = await chatAboutCase(
        courtCase,
        {
          documentId: courtCase.documentId,
          section,
          depth,
          messages: [
            ...history.map(({ role, content }) => ({ role, content })),
            { role: "user", content: trimmed },
          ],
        },
        (paragraph) => {
          if (!controller.signal.aborted)
            setPending((current) =>
              current ? { ...current, paragraphs: [...current.paragraphs, paragraph] } : null,
            );
        },
        controller.signal,
      );
      if (!controller.signal.aborted)
        setMessages([
          ...history,
          { role: "user", content: trimmed },
          {
            role: "assistant",
            content: result
              .map((paragraph) => paragraph.text)
              .join("\n\n")
              .slice(0, 4_000),
            paragraphs: result,
          },
        ]);
    } catch (reason) {
      if (!controller.signal.aborted) {
        setError(errorMessage(reason));
        setFailedQuestion(trimmed);
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setPending(null);
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(input);
  }
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }
  return (
    <aside
      aria-label="判例についての対話"
      className="flex min-h-[540px] min-w-0 flex-col border-t border-[#e8edfa] bg-[#fcfdff] lg:border-t-0 lg:border-l"
    >
      <div className="flex items-center gap-3 border-b border-[#e8edfa] bg-white px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e9efff] text-recourt-brandblue">
          <LucideMessageCircle className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold text-recourt-brandblue">この裁判について話す</p>
          <p className="mt-0.5 text-xs text-[#657391]">疑問に合わせて読んでいく</p>
        </div>
      </div>
      <div
        ref={conversationScroll}
        onScroll={(event) => {
          const element = event.currentTarget;
          followLatest.current =
            element.scrollHeight - element.scrollTop - element.clientHeight < 80;
        }}
        className="max-h-[720px] flex-1 space-y-4 overflow-auto px-4 py-5"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <p className="text-sm leading-[1.9] text-[#536183]">
            気になるところを聞いてください。選んだ判決の原文を確かめながら、一緒に整理します。
          </p>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={
              message.role === "user"
                ? "ml-8 rounded-2xl bg-[#eaf0ff] p-3 text-sm whitespace-pre-wrap"
                : "space-y-3 rounded-2xl bg-[#f1f5ff] p-3"
            }
          >
            {message.role === "user"
              ? message.content
              : message.paragraphs.map((paragraph, i) => (
                  <EvidenceParagraph key={i} paragraph={paragraph} />
                ))}
          </div>
        ))}
        {pending && (
          <>
            <p className="ml-8 rounded-2xl bg-[#eaf0ff] p-3 text-sm whitespace-pre-wrap">
              {pending.question}
            </p>
            <div className="space-y-3 rounded-2xl bg-[#f1f5ff] p-3">
              {pending.paragraphs.map((paragraph, index) => (
                <EvidenceParagraph key={index} paragraph={paragraph} />
              ))}
              <p className="text-xs text-[#657391]">原文を確認しています…</p>
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                className="text-xs text-recourt-brandblue underline"
              >
                生成を中止
              </button>
            </div>
          </>
        )}
        {error && <RetryError message={error} retry={() => void ask(failedQuestion)} />}
      </div>
      <div className="border-t border-[#e8edfa] bg-white px-4 py-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {["何が争点？", "もっと簡単に"].map((question) => (
            <button
              key={question}
              type="button"
              disabled={!!pending || !loaded}
              onClick={() => void ask(question)}
              className="rounded-full border border-[#d7e1f6] px-3 py-1.5 text-xs text-recourt-brandblue hover:bg-[#edf2ff] disabled:opacity-40"
            >
              {question}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="flex items-end gap-2">
          <label htmlFor="case-message" className="sr-only">
            この裁判について質問する
          </label>
          <textarea
            id="case-message"
            rows={2}
            maxLength={2_000}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="気になることを聞いてください"
            className="min-h-12 min-w-0 flex-1 resize-y rounded-xl border border-[#cfdbf7] px-3 py-2.5 text-sm outline-none focus:border-recourt-brandblue focus:ring-2 focus:ring-[#dce5ff]"
          />
          <button
            type="submit"
            disabled={!input.trim() || !!pending || !loaded}
            aria-label="質問を送信"
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-recourt-brandblue text-white disabled:opacity-40"
          >
            <LucideSend className="h-5 w-5" aria-hidden="true" />
          </button>
        </form>
        <p className="mt-3 text-xs leading-relaxed text-[#7a87a1]">
          会話はこのブラウザのタブ内に保存されます。説明は、この画面を開いた時の判決本文を参照します。
        </p>
      </div>
    </aside>
  );
}
