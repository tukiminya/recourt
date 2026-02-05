# @recourt/core

共通ユーティリティをまとめたパッケージです。R2、Gemini、正規化、ハッシュ、ID生成を提供します。

## 主要エクスポート
- `createR2Client`, `getR2Object`, `putR2Object`
- `buildGeminiRequest`, `callGemini`, `extractStructuredOutput`
- `normalizeJudgeName`, `normalizeKeySegment`
- `createSha256`, `hashBuffer`
- `createUuidV7`

## コマンド
```bash
pnpm --filter @recourt/core lint
pnpm --filter @recourt/core typecheck
pnpm --filter @recourt/core build
pnpm --filter @recourt/core test
```
