import z from "zod";
import { CaseArticleStorageV1 } from "./v1/entry";

/**
 * 全てのバージョンの CaseArticle Schema を提供します。
 */
export const CaseArticleStorage = z.union([CaseArticleStorageV1]);

/**
 * 最新版のStorageスキーマを返却します。
 */
export const LatestCaseArticleStorage = CaseArticleStorageV1;
export { CaseArticleStorageV1 };
