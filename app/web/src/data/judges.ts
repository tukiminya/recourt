import { CaseArticleStorage } from "@recourt/types";
import { z } from "zod";

export type JudgeCase = z.infer<typeof CaseArticleStorage>;
export type RichText = JudgeCase["title"][number];
export type CaseSection = JudgeCase["sections"][number];
export type CaseBlock = CaseSection["blocks"][number];
export type CaseEntity = Extract<JudgeCase["entities"][string], { type: "case" }>;
export type PersonEntity = Extract<JudgeCase["entities"][string], { type: "person" }>;
export type AffectedPartyBlock = Extract<CaseBlock, { type: "with_icon_list_item" }>;

const text = (content: string, link: string | null = null): RichText => ({
  type: "text",
  text: { content, link },
  annotations: { bold: false, underline: false, strikethrough: false },
});

const mention = (
  entity_id: string,
  entity_type: "statute" | "case" | "person" | "organization" | "legal_term" | "source",
): RichText => ({
  type: "mention",
  mention: { entity_id, entity_type },
  annotations: { bold: false, underline: false, strikethrough: false },
});

const paragraph = (...rich_text: RichText[]): CaseBlock => ({
  type: "paragraph",
  paragraph: { rich_text },
});

const heading = (...rich_text: RichText[]): CaseBlock => ({
  type: "heading_3",
  heading_3: { rich_text },
});

const bulletedListItem = (...rich_text: RichText[]): CaseBlock => ({
  type: "bulleted_list_item",
  bulleted_list_item: { rich_text },
});

const affectedParty = (
  icon: "organization" | "people" | "goverment",
  ...rich_text: RichText[]
): CaseBlock => ({
  type: "with_icon_list_item",
  with_icon_list_item: { icon, rich_text },
});

const article = CaseArticleStorage.parse({
  schema_version: "2026-08",
  id: "7f3e5c9d-7d56-4b40-8c6b-3a0c4e0e7f1a",
  created_time: "2026-03-21T00:00:00.000Z",
  title: [mention("family-federation", "organization"), text("に対しての解散命令の決定")],
  entities: {
    "family-federation": {
      type: "organization",
      name: "世界平和統一家庭連合",
      description: "旧統一教会。組織的な献金勧誘をめぐる解散命令の対象となった宗教法人。",
      url: "https://ja.wikipedia.org/wiki/世界平和統一家庭連合",
    },
    "case-religious-corporation-dissolution": {
      type: "case",
      title: "宗教法人解散命令申立事件",
      court: "最高裁判所第三小法廷",
      decision_date: "2026-03-21",
      case_number: "令和8(ク)407",
      summary: "宗教法人に対する解散命令の適法性が争われた事件。",
      url: "https://www.courts.go.jp/",
    },
    "religious-corporation-law-81": {
      type: "statute",
      title: "宗教法人法81条1項1号",
      citation: "宗教法人法81条1項1号",
      summary:
        "法令に違反して著しく公共の福祉を害すると明らかに認められる行為をした宗教法人について定める。",
      official_url: "https://elaws.e-gov.go.jp/document?lawid=326AC0000000126",
    },
    "civil-code-709": {
      type: "statute",
      title: "民法709条",
      citation: "民法709条",
      summary:
        "故意または過失によって他人の権利または法律上保護される利益を侵害した者の損害賠償責任を定める。",
      official_url: "https://elaws.e-gov.go.jp/document?lawid=129AC0000000089",
    },
    "constitution-20": {
      type: "statute",
      title: "憲法20条1項（信教の自由）",
      citation: "日本国憲法20条1項",
      summary: "信教の自由を保障する。",
      official_url: "https://elaws.e-gov.go.jp/document?lawid=321CONSTITUTION",
    },
    "constitution-21": {
      type: "statute",
      title: "憲法21条1項（結社の自由）",
      citation: "日本国憲法21条1項",
      summary: "集会、結社及び言論、出版その他一切の表現の自由を保障する。",
      official_url: "https://elaws.e-gov.go.jp/document?lawid=321CONSTITUTION",
    },
    "constitution-32": {
      type: "statute",
      title: "憲法32条（裁判を受ける権利）",
      citation: "日本国憲法32条",
      summary: "何人も、裁判所において裁判を受ける権利を奪われない。",
      official_url: "https://elaws.e-gov.go.jp/document?lawid=321CONSTITUTION",
    },
    "constitution-82": {
      type: "statute",
      title: "憲法82条（裁判の公開）",
      citation: "日本国憲法82条",
      summary: "裁判の対審及び判決は、公開法廷で行う。",
      official_url: "https://elaws.e-gov.go.jp/document?lawid=321CONSTITUTION",
    },
    "judge-watanabe": {
      type: "person",
      name: "渡辺惠理子",
      role: "裁判長",
      description: "本件について同意意見。",
      url: null,
    },
    "judge-hayashi": {
      type: "person",
      name: "林 道晴",
      role: "裁判官",
      description: "本件について同意意見。",
      url: null,
    },
    "judge-ishikane": {
      type: "person",
      name: "石兼公博",
      role: "裁判官",
      description: "本件について同意意見。",
      url: null,
    },
    "judge-hiraki": {
      type: "person",
      name: "平木正洋",
      role: "裁判官",
      description: "本件について同意意見。",
      url: null,
    },
  },
  sections: [
    {
      key: "introduction",
      title: "経緯",
      blocks: [
        paragraph(
          text("文部科学大臣等の請求により、"),
          mention("family-federation", "organization"),
          text("（旧統一教会）に対し、組織的な不法行為による多額の損害を与えたとして"),
          mention("religious-corporation-law-81", "statute"),
          text(
            "に基づき解散命令が出された。これに対し、法人は信教の自由の侵害や手続の適法性を主張して即時抗告したが棄却されたため、最高裁判所に特別抗告を行った。",
          ),
        ),
      ],
    },
    {
      key: "issues",
      title: "争点",
      blocks: [
        bulletedListItem(
          text("民法上の不法行為が"),
          mention("religious-corporation-law-81", "statute"),
          text("の「法令に違反」する行為に含まれるか"),
        ),
        bulletedListItem(
          text("宗教法人の解散命令が"),
          mention("constitution-20", "statute"),
          text("および"),
          mention("constitution-21", "statute"),
          text("に違反するか"),
        ),
        bulletedListItem(
          text("解散命令の手続において口頭弁論を経ないことが"),
          mention("constitution-32", "statute"),
          text("および"),
          mention("constitution-82", "statute"),
          text("に違反するか"),
        ),
      ],
    },
    {
      key: "reasons",
      title: "判断理由",
      blocks: [
        heading(text("法令違反の解釈について")),
        paragraph(
          mention("religious-corporation-law-81", "statute"),
          text("の「法令に違反」する行為には、"),
          mention("civil-code-709", "statute"),
          text(
            "の不法行為を構成する行為も含まれる。これは、宗教団体に法人格を与えておくことが不適切となる事態に対処するという同条の趣旨に基づくものである。",
          ),
        ),
        heading(text("本件における事実認定と評価")),
        paragraph(
          text(
            "抗告人の信者らは、昭和48年から令和4年までの長期にわたり、組織的な関与のもとで社会通念を逸脱した献金勧誘を行い、多額の損害を与えた。これは「法令に違反して、著しく公共の福祉を害すると明らかに認められる行為」に該当する。",
          ),
        ),
        heading(text("憲法適合性（信教の自由・結社の自由）")),
        paragraph(
          text(
            "解散命令は法人格を失わせるに留まり、法人格のない宗教団体としての存続や個人の信教の自由を直接禁止するものではない。財産処分等の支障が生じるとしても、それは解散に伴う間接的なものであり、必要かつやむを得ない制約として",
          ),
          mention("constitution-20", "statute"),
          text("、"),
          mention("constitution-21", "statute"),
          text("に違反しない。"),
        ),
        heading(text("手続の適法性（口頭弁論の要否）")),
        paragraph(
          text(
            "本件は非訟事件であり、純然たる訴訟事件ではないため、公開法廷での口頭弁論を経る必要はない。したがって、口頭弁論を経なかった原決定は",
          ),
          mention("constitution-32", "statute"),
          text("、"),
          mention("constitution-82", "statute"),
          text("に違反しない。"),
        ),
      ],
    },
    {
      key: "effect",
      title: "影響",
      blocks: [
        paragraph(
          text(
            "宗教法人の解散事由における「法令違反」の範囲が、刑事罰を伴う行為だけでなく民法上の組織的不法行為も含まれることが最高裁の判断として確定した。今後、社会的に著しい実害をもたらす宗教団体に対する規制の法的な指針となる。",
          ),
        ),
      ],
    },
    {
      key: "affected_parties",
      title: "影響を受ける主体",
      blocks: [
        affectedParty(
          "organization",
          mention("family-federation", "organization"),
          text("（抗告人）"),
        ),
        affectedParty("people", text("同法人の信者")),
        affectedParty("people", text("献金勧誘等による被害者")),
        affectedParty("goverment", text("文部科学省（所轄庁）")),
      ],
    },
  ],
  summary: {
    type: "opening_and_closing",
    items: [
      { blocks: [text("宗教を信じる自由は尊重されるべき")] },
      { blocks: [text("長年にわたり違法な献金勧誘があった")] },
      { blocks: [text("多くの人に大きな被害を与えた")] },
      { blocks: [text("これらの違法な行為により、法人格をなくす決定はやむを得ない")] },
    ],
  },
});

export const judges: Array<JudgeCase> = [article];

export function richTextToMarkdown(
  richText: Array<RichText>,
  entities: JudgeCase["entities"],
): string {
  return richText
    .map((part) => {
      if (part.type === "mention") {
        const entity = entities[part.mention.entity_id];
        if (!entity) return part.mention.entity_id;

        switch (entity.type) {
          case "person":
            return entity.name;
          case "organization":
            return entity.name;
          default:
            return entity.title;
        }
      }

      let content = part.text.content;
      if (part.text.link) content = `[${content}](${part.text.link})`;
      if (part.annotations.strikethrough) content = `~~${content}~~`;
      if (part.annotations.bold) content = `**${content}**`;
      return content;
    })
    .join("");
}

export function getBlockRichText(block: CaseBlock): Array<RichText> {
  switch (block.type) {
    case "heading_3":
      return block.heading_3.rich_text;
    case "paragraph":
      return block.paragraph.rich_text;
    case "bulleted_list_item":
      return block.bulleted_list_item.rich_text;
    case "numbered_list_item":
      return block.numbered_list_item.rich_text;
    case "with_icon_list_item":
      return block.with_icon_list_item.rich_text;
  }
}

export function getCaseEntity(article: JudgeCase): CaseEntity | undefined {
  return Object.values(article.entities).find(
    (entity): entity is CaseEntity => entity.type === "case",
  );
}

export function getJudgeEntities(article: JudgeCase): Array<PersonEntity> {
  return Object.values(article.entities).filter(
    (entity): entity is PersonEntity => entity.type === "person",
  );
}

export function getJudgeCase(id: string): JudgeCase | undefined {
  return judges.find((judgeCase) => judgeCase.id === id);
}
