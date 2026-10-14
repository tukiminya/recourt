import { useEffect, useId, useRef, useState } from "react";
import {
  caseTermExplanation,
  type CaseTermExplanation,
  type ReadingCase,
  type ReadingParagraph,
} from "@recourt/types";
import { caseApiBaseUrl, explainCaseTerm } from "./api-client";

type Citation = ReadingParagraph["citations"][number];

function cachedExplanation(key: string): CaseTermExplanation | null {
  try {
    const value = sessionStorage.getItem(key);
    if (!value) return null;
    const parsed = caseTermExplanation.safeParse(JSON.parse(value));
    if (parsed.success) return parsed.data;
    sessionStorage.removeItem(key);
  } catch {
    // A blocked browser store must not prevent reading.
  }
  return null;
}

function saveExplanation(key: string, value: CaseTermExplanation) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Keep the result in memory when session storage is unavailable.
  }
}

function TermMention({
  term,
  sourceText,
  courtCase,
  citations,
  onAskAboutTerm,
}: {
  term: string;
  sourceText: string;
  courtCase: ReadingCase;
  citations: Citation[];
  onAskAboutTerm: (term: string, context: string) => void;
}) {
  const popoverId = useId();
  const [open, setOpen] = useState(false);
  const [explanation, setExplanation] = useState<CaseTermExplanation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const key = `recourt:term:${courtCase.documentId}:${encodeURIComponent(term)}:${citations
    .map((citation) => citation.passageId)
    .sort()
    .join(",")}`;

  useEffect(() => {
    if (!open || explanation) return;
    const cached = cachedExplanation(key);
    if (cached) {
      setExplanation(cached);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    void explainCaseTerm(
      courtCase,
      {
        documentId: courtCase.documentId,
        term,
        passageIds: citations.map((citation) => citation.passageId),
      },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        saveExplanation(key, result);
        setExplanation(result);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [citations, courtCase, explanation, key, open, retry, term]);

  function openAfterHover() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpen(true), 350);
  }
  function cancelHover() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
    setOpen(false);
  }

  return (
    <span
      className="relative inline-block align-baseline"
      onMouseEnter={openAfterHover}
      onMouseLeave={cancelHover}
    >
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={popoverId}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        className="rounded-sm border-b border-dotted border-recourt-brandblue text-inherit decoration-recourt-brandblue underline-offset-2 hover:bg-[#eaf0ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-recourt-brandblue"
      >
        {term}
      </button>
      {open ? (
        <span
          id={popoverId}
          role="dialog"
          aria-label={`${term}の用語カード`}
          className="absolute left-0 top-full z-40 mt-2 block w-[min(20rem,calc(100vw-3rem))] rounded-xl border border-[#d7e1f6] bg-white p-4 text-left text-xs leading-[1.8] text-[#34405e] shadow-[0_12px_36px_rgba(0,9,103,0.16)]"
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
        >
          <span className="flex items-start justify-between gap-3">
            <strong className="text-sm text-recourt-brandblue">{term}</strong>
            <button
              type="button"
              aria-label="用語カードを閉じる"
              onClick={() => setOpen(false)}
              className="rounded px-1 text-[#657391] hover:bg-[#eef3ff]"
            >
              閉じる
            </button>
          </span>
          {loading ? (
            <span className="mt-3 block text-[#657391]">用語の説明を準備しています…</span>
          ) : null}
          {error ? (
            <span role="alert" className="mt-3 block text-[#a13c34]">
              説明を取得できませんでした。
              <button
                type="button"
                onClick={() => {
                  setError(false);
                  setRetry((value) => value + 1);
                }}
                className="ml-2 underline"
              >
                再試行
              </button>
            </span>
          ) : null}
          {explanation ? (
            <>
              <span className="mt-3 block">
                <span className="block font-semibold">一般的な意味</span>
                {explanation.generalMeaning}
              </span>
              <span className="mt-3 block">
                <span className="block font-semibold">この判決での使われ方</span>
                {explanation.caseUsage.text}
              </span>
              {explanation.citations.map((citation) => (
                <span
                  key={citation.passageId}
                  className="mt-3 block border-l-2 border-[#d7e1f6] pl-2"
                >
                  <a
                    href={new URL(citation.pdfUrl, caseApiBaseUrl).href}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-recourt-brandblue underline"
                  >
                    判決原文 · {citation.page}ページ
                  </a>
                  <span className="mt-1 block max-h-24 overflow-auto whitespace-pre-wrap">
                    {citation.excerpt}
                  </span>
                </span>
              ))}
            </>
          ) : null}
          <button
            type="button"
            disabled={loading}
            onClick={() => onAskAboutTerm(term, sourceText)}
            className="mt-4 rounded-lg bg-[#eef3ff] px-3 py-2 font-semibold text-recourt-brandblue hover:bg-[#dfe8ff] disabled:opacity-50"
          >
            この語をチャットで質問
          </button>
        </span>
      ) : null}
    </span>
  );
}

function splitMentions(text: string, mentions: string[]) {
  const terms = [...new Set(mentions.filter((term) => term && text.includes(term)))].sort(
    (left, right) => right.length - left.length,
  );
  if (terms.length === 0) return [{ text, term: null as string | null }];
  const parts: Array<{ text: string; term: string | null }> = [];
  let cursor = 0;
  let plainStart = 0;
  while (cursor < text.length) {
    const term = terms.find((candidate) => text.startsWith(candidate, cursor));
    if (!term) {
      cursor++;
      continue;
    }
    if (plainStart < cursor) parts.push({ text: text.slice(plainStart, cursor), term: null });
    parts.push({ text: term, term });
    cursor += term.length;
    plainStart = cursor;
  }
  if (plainStart < text.length) parts.push({ text: text.slice(plainStart), term: null });
  return parts;
}

export default function TermAwareText({
  text,
  termMentions,
  courtCase,
  citations,
  onAskAboutTerm,
}: {
  text: string;
  termMentions: string[];
  courtCase: ReadingCase;
  citations: Citation[];
  onAskAboutTerm: (term: string, context: string) => void;
}) {
  return (
    <>
      {splitMentions(text, termMentions).map((part, index) =>
        part.term ? (
          <TermMention
            key={`${index}:${part.term}`}
            term={part.term}
            sourceText={text}
            courtCase={courtCase}
            citations={citations}
            onAskAboutTerm={onAskAboutTerm}
          />
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}
