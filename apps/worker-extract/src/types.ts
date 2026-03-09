export interface RawDetailsMetadata {
  jiken_code: string;
  jiken_name: string;
  saiban_date: string;
  houtei_name: string;
  saiban_type: string;
  saiban_result: string;
  pdf: string;
}

export interface ExtractQueuePayload {
  type: "extract";
  detail_url: string;
  crawled_at: string;
  metadata: RawDetailsMetadata;
}
