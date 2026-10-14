export type LegalDiagram = {
  id: string;
  version: string;
  topicIds: string[];
  title: string;
  summary: string;
  scope: string;
  asOf: string;
  mermaid: string;
  sources: Array<{ label: string; url: string }>;
};

export const legalDiagrams: LegalDiagram[] = [
  {
    id: "homicide-statute-comparison",
    version: "2026-10-08",
    topicIds: ["殺人"],
    title: "刑法199条・202条の条文構造",
    summary:
      "刑法202条は、自殺を教唆・幇助する場合と、嘱託・承諾を受けて人を殺す場合を定めています。199条と202条に書かれた対象の文言と法定刑を並べています。",
    scope:
      "現行条文に書かれた対象の文言と法定刑を並べた補助図です。個別の事実認定、犯罪の成立、量刑を示すものではありません。",
    asOf: "条文確認日: 令和8年10月8日",
    mermaid: `flowchart TD
  A["人の死亡に関する条文"]
  A --> B["刑法199条: 人を殺した者"]
  B --> C["死刑・無期拘禁刑・5年以上の拘禁刑"]
  A --> D["刑法202条"]
  D --> E["人を教唆・幇助して自殺させる"]
  D --> F["嘱託・承諾を受けて人を殺す"]
  E --> G["6月以上7年以下の拘禁刑"]
  F --> G`,
    sources: [
      {
        label: "e-Gov法令検索・刑法第199条",
        url: "https://laws.e-gov.go.jp/law/140AC0000000045?occasion_date=20261008",
      },
      {
        label: "e-Gov法令検索・刑法第202条",
        url: "https://laws.e-gov.go.jp/law/140AC0000000045?occasion_date=20261008",
      },
    ],
  },
];
