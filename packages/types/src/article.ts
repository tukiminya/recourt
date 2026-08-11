import z from "zod";
import { caseArticleSchemaV1 } from "./article/v1";

export const caseArticleSchemas = z.union([caseArticleSchemaV1]);
/**
 * @description 最新版の caseArticleSchema を提供する ailias。システムの実装には基本的にこれを用いること。
 */
export const latestCaseArticleSchema = caseArticleSchemaV1;
export { caseArticleSchemaV1 };
