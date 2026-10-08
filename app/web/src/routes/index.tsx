import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { LucideArrowRight, LucideLink2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import CaseExplorer from "../features/case-explorer/CaseExplorer";
import GuidedReadingExperience from "../features/guided-reading/GuidedReadingExperience";
import { deleteReadingSource, importReadingSource, type ReadingSource } from "../features/guided-reading/api-client";

export const Route = createFileRoute("/")({ validateSearch: (search: Record<string, unknown>) => ({ topics: typeof search.topics === "string" ? search.topics.slice(0, 600) : "" }), component: HomePage });

function HomePage() {
  const { topics } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [source, setSource] = useState<ReadingSource | null>(null);
  const importMutation = useMutation({ mutationFn: importReadingSource, retry: false });
  const deleteMutation = useMutation({ mutationFn: deleteReadingSource, retry: false });

  async function startArticleReading(url: string) {
    importMutation.reset();
    try {
      setSource(await importMutation.mutateAsync(url));
    } catch {
      // The mutation error is shown beside the form.
    }
  }

  function exitArticleReading() {
    const sourceId = source?.sourceId;
    setSource(null);
    if (sourceId) deleteMutation.mutate(sourceId);
  }

  if (source) return <GuidedReadingExperience source={source} onExit={exitArticleReading} />;

  return (
    <main>
      <CaseExplorer selectedTopics={topics.split(",").filter(Boolean)} onTopicsChange={(selected) => { void navigate({ search: { topics: selected.join(",") }, replace: true }); }} />
      <ArticleUrlTrial
        onStart={startArticleReading}
        loading={importMutation.isPending}
        error={importMutation.error?.message ?? ""}
        onClearError={() => importMutation.reset()}
      />
    </main>
  );
}

function ArticleUrlTrial({ onStart, loading, error, onClearError }: {
  onStart: (url: string) => Promise<void>;
  loading: boolean;
  error: string;
  onClearError: () => void;
}) {
  const [url, setUrl] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!loading) void onStart(url.trim());
  }

  return (
    <section className="px-5 py-12" aria-label="記事URLからの対話試作">
      <div className="mx-auto max-w-[1160px] border-t border-[#e4eafa] pt-8">
        <details className="group rounded-2xl border border-[#e4eafa] bg-white px-5 py-5 sm:px-7">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-recourt-brandblue marker:content-none">
            記事URLから対話する試作を使う
            <LucideArrowRight className="h-4 w-4 transition-transform group-open:rotate-90" aria-hidden="true" />
          </summary>
          <p className="mt-4 text-sm leading-[1.8] text-[#536183]">公開記事を資料にして対話する従来の試作です。判決本文との照合は行っていません。</p>
          <form onSubmit={submit} className="mt-5 max-w-[650px]">
            <label htmlFor="news-url" className="mb-2 block text-sm font-medium text-[#27365c]">記事のURL</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-[#cbd8f4] bg-white px-4 focus-within:border-recourt-brandblue focus-within:ring-2 focus-within:ring-[#dce5ff]">
                <LucideLink2 className="h-5 w-5 shrink-0 text-[#7280a2]" aria-hidden="true" />
                <input id="news-url" type="url" required pattern="https://.*" maxLength={2_048} value={url} onChange={(event) => { setUrl(event.target.value); onClearError(); }} placeholder="https://example.com/article" aria-describedby="url-help url-error" className="h-12 min-w-0 flex-1 border-0 bg-transparent text-sm text-[#1d2b4f] outline-none placeholder:text-[#7784a1]" />
              </div>
              <button type="submit" disabled={loading} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-recourt-brandblue px-5 text-sm font-medium whitespace-nowrap text-white hover:bg-[#1523a0] disabled:cursor-wait disabled:opacity-70">
                {loading ? "読み込み中…" : "記事を読み解く"}
              </button>
            </div>
            <p id="url-help" className="mt-3 text-xs leading-relaxed text-[#657391]">公開されたHTTPSの記事に対応します。アクセス制限のある記事は取り込めない場合があります。</p>
            {error ? <p id="url-error" role="alert" className="mt-3 rounded-lg bg-[#fff1ee] px-3 py-2 text-sm text-[#a13c34]">{error}</p> : null}
          </form>
        </details>
      </div>
    </section>
  );
}
