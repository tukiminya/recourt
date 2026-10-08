# 裁判例クローリング基盤

`app/crawler`、`app/extract`、`app/external-service`、`app/internal`で、裁判例の探索から判例読解用文書の保存までを実行する。新しい読解処理の詳細は [case-reading.md](case-reading.md) を参照する。旧Queueメッセージによるdraft記事保存も維持する。

## 処理単位

1. Crawlerの`POST /crawl/{category}`が`CrawlSearchWorkflow`を開始する。
2. 検索Workflowはexternal-serviceの検索APIを呼び、判例HTML URLをCrawler Queueへ送る。新しい読解処理は投入上限で停止し、定期実行ではページ内の続き位置を保存する。
3. Crawler Queue consumerは1メッセージにつき1つの`CrawlCaseWorkflow`を開始する。
4. Case WorkflowはHTMLメタデータを取得し、裁判所・支部・事件番号を正規化して、メタデータと全文PDF URLをExtract Queueへ送る。この時点ではDBへ書き込まない。
5. Extract Queue consumerはv2メッセージから`PrepareCaseReadingWorkflow`を開始する。PDFとページ本文をR2へ保存し、トピック・一覧説明を抽出してready文書をDBへ登録する。v1は従来の`ExtractCaseWorkflow`でdraft記事を保存する。

Queueはどちらも`max_batch_size: 1`。読解処理のWorkflow IDは収集runとdetail IDから作り、同じ収集内の再配信を同じWorkflowへ送る。別runではPDFを再取得し、本文ハッシュと処理版で分類・文書登録を重複させない。旧処理は裁判所・支部・事件番号・PDF URLから作るWorkflow IDを維持する。detail IDとURLは取得先として扱い、Caseの識別には使わない。

## Crawler API

検索開始APIはService Binding経由で呼ぶ。検索queryはexternal-serviceと共通で、`offset`はCrawlerが管理するため指定できない。

- `POST /crawl/reading`（初回の主要トピック、合計50件上限）
- `POST /crawl/general`
- `POST /crawl/saikosai`
- `POST /crawl/kosai`
- `POST /crawl/kakyusai`
- `POST /crawl/gyosei`
- `POST /crawl/rodo`
- `POST /crawl/chizai`
- `GET /crawl/jobs/:crawlId`

開始APIは`202`と`crawlId`を返す。状態APIはCloudflare Workflowの現在状態と、完了時の投入件数を返す。

## 定期実行

Crawler WorkerのCron Triggerは毎日03:00 JST（`0 18 * * *` UTC）に同性婚・殺人＋量刑・婚姻を再検索する。合計50件を上限に、保存したページ内の続き位置から巡回し、最終ページの後は先頭へ戻る。裁判日による直近7日の制限は使わない。重複PDFの分類はハッシュと処理版で再利用する。

同じCronイベントが再配信された場合は、Cron式と`scheduledTime`のSHA-256から同じUUIDを生成し、同じ`CrawlSearchWorkflow`を参照する。ローカルでは次のURLでScheduled Handlerを実行できる。

```sh
cd app/crawler
pnpm dev
curl "http://localhost:8788/cdn-cgi/local/scheduled?cron=0+18+*+*+*&time=1789927200000"
```

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
- 読解処理は文書が`ready`になれば自動掲載する。旧記事処理のrevisionは`draft`のまま保存し、publishは既存APIから明示的に行う。
- 読解処理は同じCase・PDFハッシュ・処理版、旧記事処理は同じCase・`source_document_sha256`で重複登録を防ぐ。
- 同じ事件でPDFの内容が変わった場合は、同じCaseへ新しい読解文書を追加する。旧処理では新しいdraft revisionを追加する。
- Queue consumerがWorkflowを起動できないメッセージは3回後にDLQへ移る。起動後の失敗はWorkflow状態APIと構造化ログで確認する。
