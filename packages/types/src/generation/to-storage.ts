import { z } from "zod";

import { CaseArticleStorageV1, block, rich_text } from "../storage/v1/entry";
import type { support_icon } from "../storage/v1/block";
import { CaseArticleGeneration } from "./article";
import type { GenerationBlock } from "./block";
import type { GenerationRichText } from "./rich-text";

type CaseArticleStorageV1Data = z.infer<typeof CaseArticleStorageV1>;
type Block = z.infer<typeof block>;
type RichText = z.infer<typeof rich_text>;
type ArticleGeneration = z.infer<typeof CaseArticleGeneration>;

const toStorageRichText = (part: GenerationRichText): RichText => ({
  type: "text",
  text: {
    content: part.text.content,
    link: null,
  },
  annotations: part.annotations,
});

const toStorageBlock = (source: GenerationBlock): Block => ({
  type: "paragraph",
  paragraph: {
    rich_text: source.paragraph.rich_text.map(toStorageRichText),
  },
});

const toStorageTitle = (title: GenerationRichText[]): RichText[] => title.map(toStorageRichText);

const affectedPartyIcon = (
  kind: ArticleGeneration["affected_parties"][number]["kind"],
): z.infer<typeof support_icon> => {
  switch (kind) {
    case "person":
      return "people";
    case "organization":
      return "organization";
    case "government":
      return "goverment";
  }
};

const affectedParty = (party: ArticleGeneration["affected_parties"][number]): Block => ({
  type: "with_icon_list_item",
  with_icon_list_item: {
    icon: affectedPartyIcon(party.kind),
    rich_text: toStorageTitle(party.name),
  },
});

const section = (key: string, title: string, blocks: Block[]) => ({
  key,
  title,
  blocks,
});

export type { CaseArticleStorageV1Data };

/**
 * AI生成結果を、R2に保存するCaseArticleStorageV1へ変換します。
 * Entity/mentionの解決はまだ行わず、entitiesは空のままにします。
 */
export function toCaseArticleStorageV1({
  draft,
  id,
  createdTime,
}: {
  draft: ArticleGeneration;
  id: string;
  createdTime: string;
}): CaseArticleStorageV1Data {
  const article: CaseArticleStorageV1Data = {
    schema_version: "2026-08",
    id,
    created_time: createdTime,
    title: toStorageTitle(draft.title),
    entities: {},
    sections: [
      section("introduction", "はじめに", draft.introduction.map(toStorageBlock)),
      section("issues", "争点", draft.issues.map(toStorageBlock)),
      section(
        "reasons",
        "判断理由",
        draft.reasons.flatMap(({ title, blocks }) => [
          {
            type: "heading_3",
            heading_3: { rich_text: toStorageTitle(title) },
          },
          ...blocks.map(toStorageBlock),
        ]),
      ),
      section("effect", "影響", draft.effect.map(toStorageBlock)),
      section("affected_parties", "影響を受ける対象", draft.affected_parties.map(affectedParty)),
    ],
    summary: {
      type: "opening_and_closing",
      items: draft.summary.map((item) => ({
        blocks: item.paragraph.rich_text.map(toStorageRichText),
      })),
    },
  };

  return CaseArticleStorageV1.parse(article);
}
