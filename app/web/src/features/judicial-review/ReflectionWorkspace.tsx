import type { Dispatch, SetStateAction } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  reviewReasons,
  type ReviewCase,
  type ReviewJudge,
  type ReviewReflection,
  type ReviewCatalog,
  type ReviewReasonSummary,
} from "@recourt/types";
import { fetchReviewReasons } from "./api-client";
import { useReflectionDraft, useReasonSharing } from "./use-reflection-draft";

type ReadingContext = { catalog: ReviewCatalog; judge: ReviewJudge; courtCase: ReviewCase };

export default function ReflectionWorkspace({
  catalog,
  judge,
  courtCase,
}: {
  catalog: ReviewCatalog;
  judge: ReviewJudge;
  courtCase: ReviewCase;
}) {
  return (
    <section
      className="rounded-xl border border-[#dce4ee] bg-white px-5 py-7 sm:px-8"
      aria-label="考えたことを残す"
    >
      <p className="text-xs font-semibold tracking-wider text-[#24647b]">
        03 / 自分は、どう考える？
      </p>
      <h2 className="mt-2 text-xl font-semibold text-[#24364e]">
        すぐに答えを出さなくても、大丈夫。
      </h2>
      <p className="mt-3 text-sm leading-[1.9] text-[#536183]">
        どの理由に納得したか。どこが気になったか。読むだけでも、考えを途中のまま残しても構いません。
      </p>
      <ReflectionForm catalog={catalog} judge={judge} courtCase={courtCase} />
      <SharedReasons catalog={catalog} judge={judge} courtCase={courtCase} />
    </section>
  );
}

function ReflectionForm({ catalog, judge, courtCase }: ReadingContext) {
  const draft = useReflectionDraft(
    `recourt:reflection:${catalog.version}:${judge.id}:${courtCase.id}`,
  );
  const sharing = useReasonSharing({ catalog, judge, courtCase, draft });
  return (
    <div className="mt-7">
      <PrivateMemoEditor draft={draft} />
      <ReasonSharingForm loaded={draft.loaded} submission={draft.submission} sharing={sharing} />
    </div>
  );
}

function PrivateMemoEditor({ draft }: { draft: ReturnType<typeof useReflectionDraft> }) {
  const { memo, setMemo, loaded, status, setStatus, persist } = draft;
  function saveMemo() {
    setStatus(
      persist(memo)
        ? "この端末にメモを保存しました。"
        : "この環境ではメモを保存できません。必要な内容をコピーしてください。",
    );
  }
  return (
    <div className="rounded-xl bg-[#f6f8fb] p-5">
      <label htmlFor="reflection-memo" className="text-sm font-semibold text-[#24364e]">
        自分だけのメモ
      </label>
      <p id="memo-help" className="mt-2 text-xs leading-[1.8] text-[#657391]">
        メモ本文はサーバーに送信されません。保存するとこの端末のブラウザに残り、共有端末では他の利用者から見える場合があります。
      </p>
      <textarea
        id="reflection-memo"
        rows={4}
        maxLength={4_000}
        disabled={!loaded}
        aria-describedby="memo-help"
        value={memo}
        onChange={(event) => setMemo(event.target.value)}
        placeholder="たとえば、結論は同じでも理由が違うことが気になった。もう少し調べてみたい。"
        className="mt-4 w-full resize-y rounded-lg border border-[#d5deeb] bg-white px-4 py-3 text-sm leading-[1.9] outline-none focus:border-[#6f98ad] focus:ring-2 focus:ring-[#e1edf1]"
      />
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={!loaded}
          onClick={saveMemo}
          className="rounded-lg border border-[#b9c9d6] bg-white px-4 py-2 text-xs font-medium text-recourt-brandblue disabled:opacity-50"
        >
          メモを保存
        </button>
        <button
          type="button"
          disabled={!loaded}
          onClick={() => {
            setMemo("");
            setStatus(
              persist("") ? "この端末のメモを削除しました。" : "メモを削除できませんでした。",
            );
          }}
          className="text-xs text-[#657391] underline"
        >
          メモを削除
        </button>
      </div>
      <p role="status" className="mt-3 text-xs leading-relaxed text-[#526976]">
        {status}
      </p>
    </div>
  );
}

function ReasonSharingForm({
  loaded,
  submission,
  sharing,
}: {
  loaded: boolean;
  submission: ReturnType<typeof useReflectionDraft>["submission"];
  sharing: ReturnType<typeof useReasonSharing>;
}) {
  const { reasons, setReasons, saving, error, share } = sharing;
  return (
    <form onSubmit={(event) => void share(event)} className="mt-7">
      <ReasonPicker
        reasons={reasons}
        setReasons={setReasons}
        disabled={!loaded || saving || submission !== null}
      />
      {submission?.sent ? (
        <p role="status" className="mt-4 rounded-lg bg-[#edf5f7] p-4 text-sm text-[#24647b]">
          選んだ論点を共有しました。メモ本文は送信していません。
        </p>
      ) : (
        <button
          type="submit"
          disabled={!loaded || saving || reasons.length === 0}
          className="mt-5 rounded-lg bg-recourt-brandblue px-5 py-3 text-xs font-medium text-white disabled:opacity-40"
        >
          {saving
            ? "送信しています…"
            : submission
              ? "同じ論点をもう一度送信"
              : "選んだ論点だけを共有"}
        </button>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm leading-[1.8] text-[#a13c34]">
          {error}
        </p>
      )}
    </form>
  );
}

function ReasonPicker({
  reasons,
  setReasons,
  disabled,
}: {
  reasons: ReviewReflection["reasons"];
  setReasons: Dispatch<SetStateAction<ReviewReflection["reasons"]>>;
  disabled: boolean;
}) {
  return (
    <fieldset disabled={disabled}>
      <legend className="text-sm font-semibold text-[#24364e]">
        重視した論点を、任意で共有する
      </legend>
      <p className="mt-2 text-xs leading-[1.9] text-[#657391]">
        この裁判官の、この裁判について重視した点を3つまで選べます。「まだ考えたい」もひとつの選択です。選んだ論点だけを匿名で送り、集計に加えます。
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {reviewReasons.map((reason) => (
          <label
            key={reason.id}
            className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs ${reasons.includes(reason.id) ? "border-[#7a9eb2] bg-[#edf5f7] text-[#234e62]" : "border-[#dce4ee] text-[#536183]"}`}
          >
            <input
              type="checkbox"
              checked={reasons.includes(reason.id)}
              disabled={!reasons.includes(reason.id) && reasons.length >= 3}
              onChange={(event) =>
                setReasons((current) =>
                  event.target.checked
                    ? [...current, reason.id]
                    : current.filter((id) => id !== reason.id),
                )
              }
              className="accent-[#24647b]"
            />
            {reason.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SharedReasons({
  catalog,
  judge,
  courtCase,
}: {
  catalog: ReviewCatalog;
  judge: ReviewJudge;
  courtCase: ReviewCase;
}) {
  const query = useQuery({
    queryKey: ["review-reasons", catalog.version, judge.id, courtCase.id],
    queryFn: ({ signal }) => fetchReviewReasons(judge.id, courtCase.id, catalog.version, signal),
    retry: false,
  });
  return (
    <section
      className="mt-8 border-t border-[#e4eaf1] pt-7"
      aria-labelledby="shared-reasons-heading"
    >
      <h3 id="shared-reasons-heading" className="text-sm font-semibold text-[#24364e]">
        この資料を読んだ人が、重視した論点
      </h3>
      <p className="mt-2 text-xs leading-[1.9] text-[#657391]">
        この裁判官・裁判・資料の版ごとの投稿を集計しています。複数選択を含む投稿件数で、人数や世論を示す調査ではありません。
      </p>
      {query.isPending && (
        <p role="status" className="mt-4 text-xs text-[#657391]">
          共有された論点を読み込んでいます…
        </p>
      )}
      {query.error && (
        <div role="alert" className="mt-4 text-xs leading-[1.9] text-[#657391]">
          <p>{query.error.message}</p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="mt-2 text-[#24647b] underline"
          >
            集計をもう一度読み込む
          </button>
        </div>
      )}
      {query.data && <ReasonDistribution summary={query.data} />}
    </section>
  );
}

function ReasonDistribution({ summary }: { summary: ReviewReasonSummary }) {
  return (
    <>
      <p className="mt-5 text-xs text-[#536183]">
        {summary.total}件の投稿
        {summary.total === 0 ? " · まだ共有された論点はありません。" : " · 複数選択あり"}
      </p>
      <ul className="mt-4 space-y-4">
        {reviewReasons.map((reason) => {
          const count = summary.reasons.find((item) => item.id === reason.id)?.count ?? 0;
          return (
            <li key={reason.id}>
              <div className="flex items-center justify-between gap-4 text-xs text-[#536183]">
                <span>{reason.label}</span>
                <span>{count}件</span>
              </div>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#edf1f5]"
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-full bg-[#4f8ba4]"
                  style={{
                    width: `${summary.total ? Math.min(100, (count / summary.total) * 100) : 0}%`,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
