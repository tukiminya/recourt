# Agent Guide: supreme-court-precedent-viewer

## エージェント言語規則
- このリポジトリ内のエージェントは、ユーザーからのあらゆるリクエストに対して日本語で返答してください。
- ソースコードやドキュメント内のコメント（コメントアウト）も日本語で記述してください。
- ただし、AGENTS.mdは英語で記述してください。


This repository is a pnpm + Turborepo monorepo with TypeScript packages and apps.
Primary apps live under `apps/`, shared packages under `packages/`.

No Cursor rules or Copilot instructions were found in this repo.

## Quick Map
- apps/frontend: TanStack Start + Vite + React app
- apps/crawler: Crawlee-based scraper and ingestion of cases
- apps/ingest: Batch pipeline for processing pending jobs
- packages/core: Shared utilities (eg. R2, Gemini)
- packages/database: LibSQL/Turso + Drizzle schema and helpers

## Setup
- Install dependencies: `pnpm install`
- Node package manager: `pnpm@10.28.1`

## Monorepo Commands (Turbo)
- Dev (all apps): `pnpm dev`
- Build (all apps/packages): `pnpm build`
- Lint (all apps/packages): `pnpm lint`
- Test (all apps/packages): `pnpm test`
- Typecheck (all apps/packages): `pnpm typecheck`

## Package-Scoped Commands
Use pnpm filters to target a single package or app.

- Frontend dev: `pnpm --filter frontend dev`
- Frontend build: `pnpm --filter frontend build`
- Frontend lint: `pnpm --filter frontend lint`
- Frontend test: `pnpm --filter frontend test`
- Frontend typecheck: `pnpm --filter frontend typecheck`

- Crawler run: `pnpm --filter @scpv/crawler crawl`
- Crawler typecheck: `pnpm --filter @scpv/crawler typecheck`
- Ingest run: `pnpm --filter @scpv/ingest process`
- Ingest typecheck: `pnpm --filter @scpv/ingest typecheck`

- Database dev (Turso local): `pnpm --filter @scpv/database dev`
- Database generate (Drizzle): `pnpm --filter @scpv/database generate`
- Database migrate (Drizzle): `pnpm --filter @scpv/database migrate`

## Linting and Formatting
Linting is powered by Biome and invoked in most packages via:
- `pnpm -w exec biome check .`

Notes:
- `apps/frontend`, `packages/core`, `packages/database`, `apps/ingest` use Biome.
- `apps/crawler` currently echoes "no lint yet".
- Biome formats and organizes imports using repo settings (2 spaces, 100 cols).

## Tests
Only the frontend defines a test runner (Vitest).

- All tests (frontend): `pnpm --filter frontend test`
- Single test file: `pnpm --filter frontend test -- src/path/to/file.test.tsx`
- Single test by name: `pnpm --filter frontend test -- -t "case list renders"`

Other packages currently echo "no test yet".

## Typechecking
All packages use TypeScript `strict` with `noEmit`.

- Full repo: `pnpm typecheck`
- Per package: `pnpm --filter <name> typecheck`

## Code Style and Conventions
Follow existing patterns in the surrounding files and package.

### Language and Modules
- TypeScript everywhere; ESM modules (`"type": "module"`).
- Use async/await for async flows.
- Prefer explicit interfaces/types for exported APIs and configs.

### Formatting (Biome)
- Indentation: 2 spaces.
- Line width: 100 columns.
- Semicolons required.
- Double quotes for strings.
- Trailing commas in multi-line literals.
- Let Biome organize imports on save or via `biome check`.

### Imports
- Group by kind: third-party, workspace packages, relative paths.
- Separate groups with a blank line (Biome enforces this).
- In packages (`packages/*`, `apps/crawler`, `apps/ingest`), use `.js` in
  relative imports (ex: `"./config.js"`).
- In frontend UI code, follow the local pattern (often no extension), but keep
  `.js` when importing server modules (ex: `"./db.server.js"`).

### Naming
- camelCase for variables and functions.
- PascalCase for React components, classes, and types.
- File-based routes in `apps/frontend/src/routes` follow TanStack conventions,
  including `$param` segments; keep this intact.
- Use descriptive names for domain objects (case, judge, law, outcome).

### Types and Validation
- Use Zod for input validation in server functions.
- Keep Zod schemas close to the functions they validate.
- Return `null` when a lookup is expected to be optional; document with types.

### Error Handling
- Throw `Error` with context when a request fails (include status/details).
- Catch at the top-level entrypoints and set `process.exitCode = 1` after
  logging (see crawler/ingest entrypoints).
- Avoid swallowing errors silently; return `null` only for expected absence.

### Frontend Patterns
- TanStack Start server functions live in `apps/frontend/src/server`.
- Routes are file-based, export `Route` from each route module.
- Keep React components functional; use props typing inline or with types.

### Database Patterns
- LibSQL/Turso via Drizzle.
- Schema lives in `packages/database/src/schema.ts`.
- Access database through helpers (ex: `getDatabase`, `createDatabase`).

## When Adding New Code
- Prefer existing utilities in `packages/core` and `packages/database`.
- Keep side effects in entrypoints; keep helpers pure where possible.
- Add minimal logging; ensure failures are actionable.
- Update docs/README if a new env var or command is required.

## Database Schema Changes
- When editing the schema under `packages/database/`, run `pnpm --filter @scpv/database generate` and `pnpm --filter @scpv/database migrate`.
- Do not edit anything under `packages/database/migrations/` manually.

## Paths Worth Knowing
- `apps/frontend/src/routes`: UI pages
- `apps/frontend/src/server`: server functions
- `apps/crawler/src`: crawler pipeline
- `apps/ingest/src`: ingest pipeline
- `packages/core/src`: shared utilities
- `packages/database/src`: db helpers + schema
