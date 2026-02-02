# Ingest

Tursoの未処理ジョブを読み込み、Turso/R2/Geminiへ取り込むバッチです。

## 実行
```bash
pnpm --filter @scpv/ingest process
```

## リトライ
```bash
pnpm --filter @scpv/ingest retry -- --all
pnpm --filter @scpv/ingest retry -- --all --processing
pnpm --filter @scpv/ingest retry -- --all --processing --unsafe-all
pnpm --filter @scpv/ingest retry -- --job-id <id>
```

## Lint
```bash
pnpm --filter @scpv/ingest lint
```

## テスト
```bash
pnpm --filter @scpv/ingest test
```

## 型チェック
```bash
pnpm --filter @scpv/ingest typecheck
```

## ビルド
```bash
pnpm --filter @scpv/ingest build
```

## 必須環境変数
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `R2_ENDPOINT`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `GEMINI_API_KEY`

## 任意環境変数
- `R2_REGION` (default: `auto`)
- `GEMINI_PROMPT`
- `CRAWL_VERSION` (default: `v1`)
