export type GenerateArticleObjectKeyProps = {
  caseId: string;
  revisionId: string;
};

export function generateArticleObjectKey(props: GenerateArticleObjectKeyProps) {
  return `article/${props.caseId}/revision/${props.revisionId}`;
}
