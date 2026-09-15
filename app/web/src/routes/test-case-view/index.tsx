import { CaseArticleStorage } from "@recourt/types";
import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { judges, type JudgeCase } from "../../data/judges";
import CaseArticleView from "../../features/cases/CaseArticleView";

const exampleJson = JSON.stringify(judges[0], null, 2);

export const Route = createFileRoute("/test-case-view/")({
  head: () => ({
    meta: [
      { title: "判例記事プレビュー | 再考裁" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TestCaseViewPage,
});

function TestCaseViewPage() {
  const [json, setJson] = useState(exampleJson);
  const [article, setArticle] = useState<JudgeCase | null>(judges[0]);
  const [errors, setErrors] = useState<string[]>([]);

  function applyJson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    let input: unknown;
    try {
      input = JSON.parse(json);
    } catch (error) {
      setArticle(null);
      setErrors([
        error instanceof Error
          ? `JSON の構文エラー: ${error.message}`
          : "JSON を解析できませんでした。",
      ]);
      return;
    }

    const result = CaseArticleStorage.safeParse(input);
    if (!result.success) {
      setArticle(null);
      setErrors(
        result.error.issues.map(
          (issue) =>
            `${issue.path.length > 0 ? issue.path.join(".") : "JSON 全体"}: ${issue.message}`,
        ),
      );
      return;
    }

    setArticle(result.data);
    setErrors([]);
  }

  return (
    <main className="px-5 pt-[67px]">
      <JsonEditor json={json} onChange={setJson} onSubmit={applyJson} errors={errors} />
      <Preview article={article} />
    </main>
  );
}

function JsonEditor({
  json,
  onChange,
  onSubmit,
  errors,
}: {
  json: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  errors: string[];
}) {
  return (
    <section className="mx-auto max-w-[992px]">
      <h1 className="text-[28px] font-medium text-neutral-900">CaseArticleStorage プレビュー</h1>
      <p className="mt-3 text-[14px] leading-[1.7] text-neutral-600">
        CaseArticleStorage の JSON
        を貼り付けて「プレビューに反映」を押してください。右側の事件・裁判官情報が JSON
        にない場合はプレビュー用の値を表示します。
      </p>
      <form className="mt-6" onSubmit={onSubmit}>
        <label
          htmlFor="case-article-json"
          className="block text-[14px] font-medium text-neutral-900"
        >
          CaseArticleStorage JSON
        </label>
        <textarea
          id="case-article-json"
          value={json}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          aria-invalid={errors.length > 0}
          aria-describedby={errors.length > 0 ? "case-article-errors" : undefined}
          className="mt-2 h-[360px] w-full resize-y rounded-lg border border-neutral-300 bg-white p-4 font-mono text-[13px] leading-[1.5] text-neutral-900 outline-none focus:border-recourt-brandblue"
        />
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            className="rounded-lg bg-recourt-brandblue px-5 py-2.5 text-[14px] font-medium text-white hover:opacity-85"
          >
            プレビューに反映
          </button>
          <span className="text-[13px] text-neutral-600">
            入力内容はこのページ内でのみ検証・表示します。
          </span>
        </div>
      </form>
      {errors.length > 0 ? (
        <div
          id="case-article-errors"
          role="alert"
          className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-[13px] text-red-800"
        >
          <p className="font-medium">JSON を表示できません。入力内容を確認してください。</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function Preview({ article }: { article: JudgeCase | null }) {
  return (
    <section
      aria-label="判例記事のプレビュー"
      className="mx-auto mt-16 max-w-[992px] border-t border-neutral-200 pt-12"
    >
      <h2 className="mb-10 text-[14px] font-medium text-neutral-600">プレビュー</h2>
      {article ? (
        <CaseArticleView article={article} mockMetadata />
      ) : (
        <p className="text-[14px] text-neutral-600">
          有効な JSON を入力するとここに記事が表示されます。
        </p>
      )}
    </section>
  );
}
