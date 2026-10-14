import { caseDocument, caseListResult, readingTopic, type ReadingCase } from "@recourt/types";
import { z } from "zod";

// Fictional source material for local development. AI responses are still generated normally.
const samples = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    documentId: "00000000-0000-4000-8000-000000000201",
    title: "同性同士の婚姻制度をめぐる裁判",
    description: "婚姻制度の扱いと平等について考える、開発用の架空サンプルです。",
    decisionDate: "2024-03-14",
    topics: ["同性婚", "結婚", "憲法"],
    passages: [
      "当事者らは同性同士で共同生活を営み、婚姻届を提出したが受理されなかった。婚姻制度の扱いについて国に損害賠償を求めた。",
      "当事者らは、婚姻制度を利用できないことが平等に反すると主張した。国は、制度の設計には立法による検討が必要だと主張した。",
      "裁判所は、婚姻制度を利用できないことで生じる不利益と、その区別の理由を検討した。本サンプルでは損害賠償請求を棄却し、制度に関する議論と賠償責任の判断を分けて示した。",
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    documentId: "00000000-0000-4000-8000-000000000202",
    title: "殺人事件の量刑をめぐる裁判",
    description: "事件の経緯と刑の重さの判断を読む、開発用の架空サンプルです。",
    decisionDate: "2024-04-12",
    topics: ["殺人", "量刑"],
    passages: [
      "被告人は被害者を死亡させたとして起訴された。審理では、事件に至る経緯、犯行時の行動、事件後の対応が検討された。",
      "検察官は犯行の重大さを理由に重い刑を求めた。弁護人は、被告人が事実を認めて反省していることなどを考慮すべきだと主張した。",
      "裁判所は殺人の成立を認めたうえで、結果の重大さ、動機、反省などを総合して刑を定めた。本サンプルの本文には具体的な刑期は記載していない。",
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000103",
    documentId: "00000000-0000-4000-8000-000000000203",
    title: "別居中の生活費の分担をめぐる裁判",
    description: "家族の生活費と分担を考える、開発用の架空サンプルです。",
    decisionDate: "2024-05-20",
    topics: ["結婚", "家族"],
    passages: [
      "夫婦は別居し、一方が子どもと暮らしていた。生活費の分担額について合意できず、裁判所に判断を求めた。",
      "申立人は日常の生活費と子どもの費用が必要だと主張した。相手方は収入が減少していることを理由に、求められた額を負担できないと主張した。",
      "裁判所は双方の収入と生活の状況を確認し、生活費の分担を命じた。離婚そのものや子どもの監護者については、このサンプルでは判断していない。",
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000104",
    documentId: "00000000-0000-4000-8000-000000000204",
    title: "婚姻関係と損害賠償をめぐる裁判",
    description: "当事者の主張と賠償責任を読み分ける、開発用の架空サンプルです。",
    decisionDate: "2024-06-03",
    topics: ["結婚", "損害賠償"],
    passages: [
      "原告は、被告の行為によって婚姻関係に影響が生じ、精神的な苦痛を受けたとして損害賠償を請求した。",
      "被告は、原告の婚姻関係は以前から悪化しており、自分の行為と損害には関係がないと主張した。",
      "裁判所は当事者の連絡内容と生活状況を検討し、被告の行為と損害の関係を認めて請求を一部認容した。請求額の全額を認めたものではない。",
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000105",
    documentId: "00000000-0000-4000-8000-000000000205",
    title: "残業代の支払いをめぐる裁判",
    description: "働いた時間と賃金の争いを読む、開発用の架空サンプルです。",
    decisionDate: "2024-07-18",
    topics: ["労働", "賃金"],
    passages: [
      "従業員は会社に対し、所定の勤務時間を超えて働いた分の賃金が支払われていないとして、その支払いを求めた。",
      "従業員は勤務記録と業務の連絡内容を示した。会社は一部の時間について、業務のために働いた時間ではないと主張した。",
      "裁判所は記録と業務の実態を照合し、確認できた時間について未払い賃金の支払いを命じた。記録のない時間をすべて勤務時間と認定したものではない。",
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000106",
    documentId: "00000000-0000-4000-8000-000000000206",
    title: "商品購入の契約と返金をめぐる裁判",
    description: "契約時の説明と返金の争いを考える、開発用の架空サンプルです。",
    decisionDate: "2024-08-09",
    topics: ["消費者", "契約", "損害賠償"],
    passages: [
      "購入者は商品の性能について説明を受けて契約したが、届いた商品が説明と異なるとして、販売者に返金と損害賠償を求めた。",
      "購入者は広告と契約時の説明を根拠にした。販売者は商品の性能を保証したわけではなく、使い方にも原因があると主張した。",
      "裁判所は広告、説明、商品の状態を検討し、代金の返還を命じた。一方、追加の損害については証拠が足りず、その請求を棄却した。",
    ],
  },
];

const documents = z.array(caseDocument).parse(
  samples.map((sample, index) => {
    const passages = [
      "これは画面確認用に作成した架空の判例資料です。実在の事件や裁判所の判決ではありません。",
      ...sample.passages,
    ].map((text, passageIndex) => ({ id: `p1-${passageIndex + 1}`, page: 1, text }));
    return {
      case: {
        id: sample.id,
        documentId: sample.documentId,
        title: `【モック】${sample.title}`,
        description: sample.description,
        courtName: "サンプル裁判所（架空）",
        caseNumber: `サンプル事件第${index + 1}号`,
        decisionDate: sample.decisionDate,
        detailUrl: `https://example.com/recourt/mock-cases/${sample.id}`,
        topics: sample.topics.map((label) => ({ id: label, label })),
        pageCount: 1,
      },
      text: {
        version: 1,
        pages: [{ page: 1, text: passages.map((p) => p.text).join("") }],
        passages,
      },
    };
  }),
);

function relevance(courtCase: ReadingCase, topicIds: Set<string>) {
  return courtCase.topics.filter((topic) => topicIds.has(topic.id)).length;
}

export function mockCaseReadingResponse(path: string): Response | undefined {
  const url = new URL(path, "https://mock.internal/");
  if (url.pathname === "/topics") {
    const counts = new Map<string, number>();
    for (const document of documents) {
      for (const topic of document.case.topics)
        counts.set(topic.id, (counts.get(topic.id) ?? 0) + 1);
    }
    const topics = [...counts].map(([label, count]) => ({ id: label, label, count }));
    topics.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ja"));
    return Response.json({ topics: readingTopic.array().parse(topics) });
  }
  if (url.pathname === "/cases") {
    const topicIds = new Set((url.searchParams.get("topics") ?? "").split(",").filter(Boolean));
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const cases = documents
      .map((document) => document.case)
      .filter((c) => relevance(c, topicIds) > 0);
    cases.sort(
      (a, b) =>
        relevance(b, topicIds) - relevance(a, topicIds) ||
        (b.decisionDate ?? "").localeCompare(a.decisionDate ?? "") ||
        b.documentId.localeCompare(a.documentId),
    );
    return Response.json(
      caseListResult.parse({
        cases: cases.slice(offset, offset + 20),
        total: cases.length,
        offset,
        limit: 20,
      }),
    );
  }
  const match = url.pathname.match(/^\/cases\/([^/]+)(?:\/documents\/([^/]+))?$/);
  if (!match) return undefined;
  const document = documents.find((d) => d.case.id === match[1]);
  if (!document || (match[2] && document.case.documentId !== match[2]))
    return new Response(null, { status: 404 });
  return Response.json(match[2] ? document : document.case);
}
