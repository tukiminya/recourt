# 裁判例クローリング基盤

`app/crawler`、`app/extract`、`app/external-service`、`app/internal`で、裁判例の探索からdraft記事保存までを実行する。

## 処理単位

1. Crawlerの`POST /crawl/{category}`が`CrawlSearchWorkflow`を開始する。
2. 検索Workflowはexternal-serviceの検索APIを`nextOffset`がなくなるまで呼び、判例HTML URLをCrawler Queueへ送る。
3. Crawler Queue consumerは1メッセージにつき1つの`CrawlCaseWorkflow`を開始する。
4. Case WorkflowはHTMLメタデータを取得し、裁判所・支部・事件番号を正規化して、メタデータと全文PDF URLをExtract Queueへ送る。この時点ではDBへ書き込まない。
5. Extract Queue consumerは`ExtractCaseWorkflow`を開始する。WorkflowはPDFを取得し、Vercel AI Gateway経由で記事を生成して、Caseとdraft revisionを初めて保存する。

Queueはどちらも`max_batch_size: 1`で、裁判所・支部・事件番号・PDF URLから作るWorkflow IDによって再配信を安全に処理する。detail IDとURLは取得先として扱い、Caseの識別には使わない。

## Crawler API

検索開始APIはService Binding経由で呼ぶ。検索queryはexternal-serviceと共通で、`offset`はCrawlerが管理するため指定できない。

- `POST /crawl/general`
- `POST /crawl/saikosai`
- `POST /crawl/kosai`
- `POST /crawl/kakyusai`
- `POST /crawl/gyosei`
- `POST /crawl/rodo`
- `POST /crawl/chizai`
- `GET /crawl/jobs/:crawlId`

開始APIは`202`と`crawlId`を返す。状態APIはCloudflare Workflowの現在状態と、完了時の投入件数を返す。

## 必要なCloudflareリソース

デプロイ前に次のQueueを作成する。

```sh
wrangler queues create recourt-crawler
wrangler queues create recourt-crawler-dlq
wrangler queues create recourt-extract
wrangler queues create recourt-extract-dlq
```

Extract Workerには`VERCEL_AI_GATEWAY_API_KEY` secretが必要になる。

```sh
cd app/extract
wrangler secret put VERCEL_AI_GATEWAY_API_KEY
```

DBには[`packages/database/migrations`](../packages/database/migrations/)のmigrationを番号順に適用する。既存の`cases`と`case_revisions`を前提とした差分で、`裁判所 + 支部 + 元号 + 年 + 符号 + 番号`の自然キーと`source_document_sha256`を追加する。

## 運用上の制約

- detail URLとPDF URLは`https://www.courts.go.jp`の既知パスだけを許可する。
- HTMLは5 MiB、PDFは25 MiBを上限とする。
- AI SDK内の再試行は無効にし、Workflowのステップ再試行へ集約する。
- 生成したrevisionは`draft`のまま保存し、publishは既存APIから明示的に行う。
- 同じCaseと同じPDF本文の組み合わせは`source_document_sha256`で重複登録を防ぐ。
- 同じ事件のPDF URLが変わった場合は、同じCaseへ新しいdraft revisionを追加する。
- Queue consumerがWorkflowを起動できないメッセージは3回後にDLQへ移る。起動後の失敗はWorkflow状態APIと構造化ログで確認する。
