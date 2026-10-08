import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { fetchCase } from "../features/case-explorer/api-client";
import { ReadingRequestError } from "../features/guided-reading/api-client";
import CaseReadingExperience from "../features/case-explorer/CaseReadingExperience";

export const Route = createFileRoute("/cases/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    topics: typeof search.topics === "string" && search.topics.length <= 600 ? search.topics : "",
  }),
  loader: async ({ params }) => {
    try {
      return await fetchCase(params.id);
    } catch (error) {
      if (error instanceof ReadingRequestError && error.status === 404) throw notFound();
      throw error;
    }
  },
  pendingComponent: () => (
    <main className="px-5 pt-28 text-center text-[#536183]">裁判の資料を読み込んでいます…</main>
  ),
  errorComponent: CaseLoadError,
  notFoundComponent: () => (
    <main className="px-5 pt-28 text-center">
      <p>この裁判の読解資料が見つかりませんでした。</p>
      <Link to="/" search={{ topics: "" }} className="mt-4 inline-block underline">
        一覧に戻る
      </Link>
    </main>
  ),
  component: CasePage,
});
function CasePage() {
  const courtCase = Route.useLoaderData();
  const { topics } = Route.useSearch();
  return (
    <main className="pt-[72px]">
      <CaseReadingExperience key={courtCase.documentId} courtCase={courtCase} topics={topics} />
    </main>
  );
}
function CaseLoadError() {
  const router = useRouter();
  return (
    <main className="px-5 pt-28 text-center" role="alert">
      <p>判例データを取得できませんでした。</p>
      <button
        type="button"
        onClick={() => void router.invalidate()}
        className="mt-4 text-recourt-brandblue underline"
      >
        もう一度試す
      </button>
    </main>
  );
}
