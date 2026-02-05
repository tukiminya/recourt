# Crawler

Crawlee + CheerioCrawler で判例ページをクロールし、Tursoへ保存します。

## 実行
```bash
pnpm --filter @recourt/crawler crawl
```

## Lint
```bash
pnpm --filter @recourt/crawler lint
```

## テスト
```bash
pnpm --filter @recourt/crawler test
```

## 型チェック
```bash
pnpm --filter @recourt/crawler typecheck
```

## ビルド
```bash
pnpm --filter @recourt/crawler build
```

## 必須環境変数
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `CRAWL_START_DATE`
- `CRAWL_END_DATE`

## 任意環境変数
- `CRAWL_DELAY_SECONDS` (default: `1`)
- `CRAWL_VERSION` (default: `v1`)

## 最高裁検索ページ向けの例
```env
CRAWL_START_DATE=2025-01-01
CRAWL_END_DATE=2025-12-31
```

## 出力
- Tursoの `cases` と `ingest_jobs` に保存されます
