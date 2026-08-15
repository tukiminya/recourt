export type GenerateArticleObjectKeyProps = {
  articleId: string;
  revisionId: string;
};

export function generateArticleObjectKey(props: GenerateArticleObjectKeyProps) {
  return `article/${props.articleId}/revision/${props.revisionId}`;
}
