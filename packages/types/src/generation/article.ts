import { z } from "zod";

import { generationBlock } from "./block";
import { generationRichText } from "./rich-text";

/**
 * AIが判例記事を生成するための中間データです。
 *
 * Storageの表現ではなく、AIが内容を整理して記述するための意味的な
 * 構造を表します。Storageへ保存する際は変換処理を通してください。
 */
export const CaseArticleGeneration = z.object({
  title: z
    .array(generationRichText)
    .min(1)
    .describe("判例の内容を端的に表すタイトル。太字装飾は必要な箇所だけに使う。"),

  summary: z.array(generationBlock).describe("判例の結論や重要なポイントを、段落ごとに整理する。"),

  introduction: z
    .array(generationBlock)
    .describe("判例の背景、当事者、問題となった出来事を段落ごとに説明する。"),

  issues: z.array(generationBlock).describe("主要な争点を、争点ごとに1つの段落として記述する。"),

  reasons: z
    .array(
      z
        .object({
          title: z
            .array(generationRichText)
            .min(1)
            .describe("判断理由の内容を端的に表す見出しテキスト。"),
          blocks: z.array(generationBlock).describe("判断理由を段落ごとに説明する。"),
        })
        .describe("1つの論点に関する判断理由。"),
    )
    .describe("裁判所の判断理由を、論点ごとに整理する。"),

  effect: z
    .array(generationBlock)
    .describe("判決が当事者、同種事案、社会や実務に与える影響を段落ごとに説明する。"),

  affected_parties: z
    .array(
      z
        .object({
          kind: z
            .enum(["person", "organization", "government"])
            .describe("影響を受ける対象の種類。"),
          name: z
            .array(generationRichText)
            .min(1)
            .describe("影響を受ける個人・組織・政府機関の名称。"),
        })
        .describe("判決の影響を受ける1つの対象。"),
    )
    .describe("この判決によって影響を受ける個人・組織・政府機関を列挙する。"),
});

export type CaseArticleGeneration = z.infer<typeof CaseArticleGeneration>;
