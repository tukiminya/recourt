# @recourt/database

Turso + Drizzle 用のデータベースヘルパーとスキーマを提供するパッケージです。

## v2 Schema について
Vibe Coding で量産されたスキーマを見直し、再利用可能なコードにするために大規模に作り直します。
v1 との互換性はありません。既存のデータなど全てクロールし直す必要があります。

## 主要エクスポート
- `createDatabase`
- `runMigrations`
- `schema` と各テーブル/型

## コマンド
```bash
pnpm --filter @recourt/database dev
pnpm --filter @recourt/database generate
pnpm --filter @recourt/database migrate
pnpm --filter @recourt/database lint
pnpm --filter @recourt/database typecheck
pnpm --filter @recourt/database build
pnpm --filter @recourt/database test
```
