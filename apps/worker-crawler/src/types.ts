export interface CrawlerQueuePayload {
  type: "list" | "details";
  url: URL;
}

export interface RawDetailsMetadata {
  /**
   * @description 裁判所での事件番号
   * @example `令和6(受)2399`
   */
  jiken_code: string;
  /**
   * @description 裁判所での事件名
   * @example `労働契約法２０条違反による損害賠償請求事件`
   */
  jiken_name: string;
  /**
   * @description 和暦での裁判年月日（`SerializedDetailsMetadata`型は西暦に直されます）
   * @example `令和8年2月13日`
   */
  saiban_date: string;
  /**
   * @description 法廷名
   * @example `最高裁判所第二小法廷`
   */
  houtei_name: string;
  /**
   * @description 裁判種別
   * @example `判決`
   */
  saiban_type: string;
  /**
   * @description 結果
   * @example `却下`, `破棄差戻`, `その他`
   */
  saiban_result: string;
  /**
   * @description 本文のPDFのURL
   * @example `https:\/\/www.courts.go.jp\/assets\/hanrei\/hanrei-pdf-95523.pdf`
   */
  pdf: string;
}

export interface SerializedDetailsMetadata extends Omit<RawDetailsMetadata, "saiban_date"> {
  /**
   * @description 西暦での裁判年月日（時間は一律で00:00:00.000になる）
   * @example `2026-02-13T00:00:00.000Z`
   */
  saiban_date: Date;
}
