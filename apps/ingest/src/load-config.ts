export interface IngestConfig {
  turso: {
    url: string;
    authToken?: string;
  };
  r2: {
    endpoint: string;
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
  };
  gemini: {
    apiKey: string;
    prompt: string;
  };
}

const required = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
};

export const loadConfig = (): IngestConfig => {
  return {
    turso: {
      url: required("TURSO_DATABASE_URL"),
      authToken: process.env.TURSO_AUTH_TOKEN,
    },
    r2: {
      endpoint: required("R2_ENDPOINT"),
      accessKeyId: required("R2_ACCESS_KEY_ID"),
      secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
      region: process.env.R2_REGION ?? "auto",
      bucket: required("R2_BUCKET"),
    },
    gemini: {
      apiKey: required("GOOGLE_GENERATIVE_AI_API_KEY"),
      prompt:
        process.env.GEMINI_PROMPT ??
        `あなたは最高裁判例の読解支援AIです。
以下のPDFとメタデータを読み取り、指定のJSON形式で要約を出力してください。

重要な制約:
- 裁判官の補足意見・反対意見の本文は原文のまま保存されます。
- あなたの役割は原文から読み取れる範囲内での短い要約に限定してください。
- 推測・思想・価値判断の断定は禁止です。
- 原文に書かれていない内容は「不明」または「明記なし」と記載してください。
- 要約は2〜4文以内、簡潔な常体で書いてください。
- 用語解説は必要なものだけにしてください。
- JSONのみを出力し、余計な説明は書かないでください。

出力JSON仕様:
- case_title_short: 一般向けの短い通称（20〜30文字程度）
- summary: 事件全体の短い要約（2〜3文）
- background: 当事者の関係や経緯（不明なら「不明」）
- issues: 争点の箇条書き（配列）
- reasoning: 判決理由の要点（3〜5項目の配列）
- impact: 社会/実務への影響（本文にある範囲、2〜3文）
- impacted_parties: 影響を受ける主体（配列）
- what_we_learned: 明確になったこと（2〜3文）
- glossary: 用語解説の配列（term, explanation）
- judges: 裁判官配列に opinion_summary を追加
  - opinion_summary: 原文の範囲内での短い要約（2〜3文、推測禁止）

必ずJSONのみを出力してください。`,
    },
  };
};
