export type JudgeRole = "裁判長" | "裁判官";

export type Judge = {
  name: string;
  role: JudgeRole;
  opinion: "同意" | "反対";
};

export type CaseSection = {
  title: string;
  body: Array<string>;
  heading?: string;
};

export type AffectedParty = {
  label: string;
  icon: "building" | "users" | "landmark";
};

export type Tip = {
  title: string;
  body: Array<string>;
  sourceLabel: string;
  sourceUrl: string;
};

export type JudgeCase = {
  id: string;
  title: string;
  kind: string;
  result: string;
  order: string;
  caseName: string;
  caseNumber: string;
  court: string;
  codeDescription: string;
  summary: Array<string>;
  background: Array<string>;
  issues: Array<string>;
  reasons: Array<CaseSection>;
  impact: string;
  affectedParties: Array<AffectedParty>;
  judges: Array<Judge>;
  tips: Array<Tip>;
  sourceUrl: string;
};

export const judges: Array<JudgeCase> = [
  {
    id: "religious-corporation-dissolution",
    title: "[世界平和統一家庭連合](#tip-family-federation)に対しての解散命令の決定",
    kind: "決定",
    result: "棄却",
    order: "本件抗告を棄却する。抗告費用は抗告人の負担とする。",
    caseName: "宗教法人解散命令申立事件",
    caseNumber: "令和8(ク)407",
    court: "最高裁判所第三小法廷",
    codeDescription: "ク：最高裁判所の民事特別抗告事件",
    summary: [
      "宗教を信じる自由は尊重されるべき",
      "長年にわたり違法な献金勧誘があった",
      "多くの人に大きな被害を与えた",
      "これらの違法な行為により、法人格をなくす決定はやむを得ない",
    ],
    background: [
      "文部科学大臣等の請求により、世界平和統一家庭連合（旧統一教会）に対し、組織的な不法行為による多額の損害を与えたとして[宗教法人法](https://elaws.e-gov.go.jp/document?lawid=326AC0000000126)に基づき解散命令が出された。これに対し、法人は信教の自由の侵害や手続の適法性を主張して[即時抗告](#)したが棄却されたため、最高裁判所に[特別抗告](#)を行った。",
    ],
    issues: [
      "民法上の不法行為が[宗教法人法81条1項1号](https://elaws.e-gov.go.jp/document?lawid=326AC0000000126)の「法令に違反」する行為に含まれるか",
      "宗教法人の解散命令が[憲法20条1項（信教の自由）](#tip-constitution-20)および[21条1項（結社の自由）](#)に違反するか",
      "解散命令の手続において口頭弁論を経ないことが[憲法32条（裁判を受ける権利）](#)および[82条（裁判の公開）](#)に違反するか",
    ],
    reasons: [
      {
        title: "判断理由",
        heading: "法令違反の解釈について",
        body: [
          "[宗教法人法81条1項1号](https://elaws.e-gov.go.jp/document?lawid=326AC0000000126)の「法令に違反」する行為には、[民法709条](https://elaws.e-gov.go.jp/document?lawid=129AC0000000089)の不法行為を構成する行為も含まれる。これは、宗教団体に法人格を与えておくことが不適切となる事態に対処するという同条の趣旨に基づくものである。",
        ],
      },
      {
        title: "判断理由",
        heading: "本件における事実認定と評価",
        body: [
          "抗告人の信者らは、昭和48年から令和4年までの長期にわたり、組織的な関与のもとで社会通念を逸脱した献金勧誘を行い、多額の損害を与えた。これは「法令に違反して、著しく公共の福祉を害すると明らかに認められる行為」に該当する。",
        ],
      },
      {
        title: "判断理由",
        heading: "憲法適合性（信教の自由・結社の自由）",
        body: [
          "解散命令は法人格を失わせるに留まり、法人格のない宗教団体としての存続や**個人の信教の自由を直接禁止するものではない**。財産処分等の支障が生じるとしても、それは解散に伴う間接的なものであり、**必要かつやむを得ない制約**として[憲法20条1項](#tip-constitution-20)、[21条1項](#)に違反しない。",
        ],
      },
      {
        title: "判断理由",
        heading: "手続の適法性（口頭弁論の要否）",
        body: [
          "本件は非訟事件であり、純然たる訴訟事件ではないため、公開法廷での口頭弁論を経る必要はない。したがって、口頭弁論を経なかった原決定は[憲法32条](#)、[82条](#)に違反しない。",
        ],
      },
    ],
    impact:
      "宗教法人の解散事由における「法令違反」の範囲が、刑事罰を伴う行為だけでなく**民法上の組織的不法行為も含まれる**ことが最高裁の判断として確定した。今後、社会的に著しい実害をもたらす宗教団体に対する規制の法的な指針となる。",
    affectedParties: [
      { label: "世界平和統一家庭連合（抗告人）", icon: "building" },
      { label: "同法人の信者", icon: "users" },
      { label: "献金勧誘等による被害者", icon: "users" },
      { label: "文部科学省（所轄庁）", icon: "landmark" },
    ],
    judges: [
      { name: "渡辺惠理子", role: "裁判長", opinion: "同意" },
      { name: "林 道晴", role: "裁判官", opinion: "同意" },
      { name: "石兼公博", role: "裁判官", opinion: "同意" },
      { name: "平木正洋", role: "裁判官", opinion: "同意" },
    ],
    tips: [
      {
        title: "世界平和統一家庭連合",
        body: [
          "統一教会（現：世界平和統一家庭連合）はキリスト教系の新宗教であり、1954年に韓国で設立された。",
          "高額な献金や霊感商法問題から、文部科学省が宗教法人の解散命令を出し、この判例で決定した。",
        ],
        sourceLabel: "Wikipedia: 世界平和統一家庭連合",
        sourceUrl: "https://ja.wikipedia.org/wiki/世界平和統一家庭連合",
      },
      {
        title: "憲法20条1項",
        body: [
          "信教の自由は、何人に対してもこれを保障する。",
          "いかなる宗教団体も、国から特権を受け、又は政治上の権力を行使してはならない。",
        ],
        sourceLabel: "e-gov 日本国憲法",
        sourceUrl: "https://elaws.e-gov.go.jp/document?lawid=321CONSTITUTION",
      },
    ],
    sourceUrl: "https://www.courts.go.jp/",
  },
];

export function getJudgeCase(id: string) {
  return judges.find((judgeCase) => judgeCase.id === id);
}
