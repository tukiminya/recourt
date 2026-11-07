import { reviewCatalogSchema } from "@recourt/types";

// Published reading material: changes are reviewed in Git and receive a new edition.
// Judge participation and individual-opinion pages were checked against the linked PDFs.
export const edition20261106 = reviewCatalogSchema.parse({
  version: "2026-11-06.1",
  publishedAt: "2026-11-06",
  judges: [
    { id: "uga-katsuya", name: "宇賀 克也", reading: "うが かつや" },
    { id: "tokura-saburo", name: "戸倉 三郎", reading: "とくら さぶろう" },
    { id: "miura-mamoru", name: "三浦 守", reading: "みうら まもる" },
  ],
  cases: [
    {
      id: "gender-recognition-2023",
      title: "性別の変更と、手術を受けない自由",
      question: "法的な性別を変えるために、身体への手術を求めてよい？",
      date: "2023-10-25",
      caseNumber: "令和2年（ク）第993号",
      topic: "身体と権利",
      conclusion:
        "生殖能力を失うことを求める要件を違憲・無効とし、外観に関する別の要件の審理のため、高裁へ差し戻しました。",
      conclusionPages: [9, 10],
      pdfUrl: "https://www.courts.go.jp/assets/hanrei/hanrei-pdf-92527.pdf",
      detailUrl: "https://www.courts.go.jp/hanrei/92527/detail2/index.html",
      opinions: [
        {
          judgeId: "uga-katsuya",
          kind: "dissenting",
          summary:
            "生殖能力の要件の違憲判断には賛同。外観の要件も違憲とし、差戻しをせず性別変更を認めるべきとしました。",
          pages: [31, 36],
        },
        {
          judgeId: "tokura-saburo",
          kind: "majority",
          summary: "違憲判断と高裁への差戻しに賛同。戸倉裁判官の個別意見の記載はありません。",
          pages: [9, 10],
        },
        {
          judgeId: "miura-mamoru",
          kind: "dissenting",
          summary:
            "生殖能力の要件の違憲判断には賛同。外観の要件も違憲とし、その場で性別変更を認めるべきとしました。",
          pages: [10, 11],
        },
      ],
    },
    {
      id: "overseas-review-2022",
      title: "海外で暮らす人の、国民審査への参加",
      question: "海外に住んでいると、裁判官を審査する機会を持てない？",
      date: "2022-05-25",
      caseNumber: "令和2年（行ツ）第255号ほか",
      topic: "国民審査",
      conclusion:
        "在外国民の審査権行使を認めないことを違憲と判断。次回審査で行使させないことの違法確認と、国家賠償を認めました。",
      conclusionPages: [3, 14],
      pdfUrl: "https://www.courts.go.jp/assets/hanrei/hanrei-pdf-91190.pdf",
      detailUrl: "https://www.courts.go.jp/hanrei/91190/detail2/index.html",
      opinions: [
        {
          judgeId: "uga-katsuya",
          kind: "concurring",
          summary:
            "結論に賛同し、国民審査への参加を参政権として捉え、在外国民の機会の保障について補足しました。",
          pages: [14, 18],
        },
        {
          judgeId: "tokura-saburo",
          kind: "majority",
          summary: "全員一致の法廷意見に賛同。戸倉裁判官の個別意見の記載はありません。",
          pages: [14, 18],
        },
        {
          judgeId: "miura-mamoru",
          kind: "majority",
          summary: "全員一致の法廷意見に賛同。三浦裁判官の個別意見の記載はありません。",
          pages: [14, 18],
        },
      ],
    },
    {
      id: "married-surnames-2021",
      title: "結婚するときの、ふたりの氏",
      question: "それぞれの氏のままで出した婚姻届を、受理すべき？",
      date: "2021-06-23",
      caseNumber: "令和2年（ク）第102号",
      topic: "結婚と家族",
      conclusion: "夫婦同氏を定める規定を合憲とし、婚姻届の不受理を争った抗告を棄却しました。",
      conclusionPages: [1, 2],
      pdfUrl: "https://www.courts.go.jp/assets/hanrei/hanrei-pdf-90412.pdf",
      detailUrl: "https://www.courts.go.jp/hanrei/90412/detail2/index.html",
      opinions: [
        {
          judgeId: "uga-katsuya",
          kind: "dissenting",
          summary:
            "宮崎裕子裁判官との共同反対意見。規定を違憲とし、婚姻届の受理を命ずるべきとしました。",
          pages: [17, 18],
        },
        {
          judgeId: "tokura-saburo",
          kind: "majority",
          summary: "規定を合憲とする多数意見に賛同。戸倉裁判官の個別意見の記載はありません。",
          pages: [1, 2],
        },
        {
          judgeId: "miura-mamoru",
          kind: "opinion",
          summary:
            "別氏の選択肢がないことは違憲と考えつつ、必要な立法がない以上は届出を受理できず、抗告棄却の結論には賛同しました。",
          pages: [7, 17],
        },
      ],
    },
  ],
});
