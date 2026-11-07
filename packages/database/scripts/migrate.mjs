import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { readMigrationFiles } from "drizzle-orm/migrator";

const packageDirectory = fileURLToPath(new URL("../", import.meta.url));
const environmentFile = new URL("../../../.env", import.meta.url);
const migrationsFolder = fileURLToPath(new URL("../migrations/", import.meta.url));
const configFile = fileURLToPath(new URL("../drizzle.config.ts", import.meta.url));

export function readEnvironment(file, inherited = process.env) {
  let contents = "";
  try {
    contents = readFileSync(file, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT")
      throw new Error(".env を読み込めませんでした。アクセス権を確認してください。");
  }
  // CI and explicitly exported variables take precedence over the local .env.
  return { ...parseEnv(contents), ...inherited };
}

export function validateDatabaseUrl(value) {
  if (!value?.trim())
    throw new Error(
      "DB_URL が未設定です。ルートの .env.example を .env にコピーし、接続先を設定してください。",
    );
  try {
    const url = new URL(value);
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !url.hostname ||
      url.pathname.length < 2
    )
      throw new Error();
  } catch {
    throw new Error("DB_URL にはデータベース名を含む PostgreSQL 形式の接続URLを指定してください。");
  }
}

export function run(args = process.argv.slice(2)) {
  if (args.length > 1 || (args.length === 1 && !["--help", "-h", "--dry-run"].includes(args[0])))
    throw new Error("使用方法: pnpm db:migrate [--dry-run | --help]");
  if (args[0] === "--help" || args[0] === "-h") {
    console.log(
      "pnpm db:migrate            未適用のSQLをDrizzleの履歴に従って適用\npnpm db:migrate --dry-run  全SQLファイルを検証・一覧表示（DB接続なし）\n接続先: 環境変数 DB_URL、またはリポジトリルートの .env",
    );
    return 0;
  }
  const migrations = readMigrationFiles({ migrationsFolder });
  if (
    migrations.length === 0 ||
    migrations.some((migration) => !migration.sql.some((statement) => statement.trim()))
  )
    throw new Error("マイグレーションSQLが見つからないか、空のファイルがあります。");
  if (args[0] === "--dry-run") {
    console.log(
      `${migrations.length}件のSQLファイルを確認しました（適用済み・未適用の判定は行いません）。`,
    );
    for (const migration of migrations) console.log(`  ${migration.name}`);
    console.log("DBへの接続・適用は行っていません。");
    return 0;
  }
  const environment = readEnvironment(environmentFile);
  validateDatabaseUrl(environment.DB_URL);
  const cliFile = fileURLToPath(new URL("./bin.cjs", import.meta.resolve("drizzle-kit")));
  const result = spawnSync(process.execPath, [cliFile, "migrate", "--config", configFile], {
    cwd: packageDirectory,
    env: environment,
    stdio: "inherit",
  });
  if (result.error)
    throw new Error("Drizzleを起動できませんでした。pnpm install を実行してください。");
  return result.status ?? 1;
}

if (import.meta.main) {
  try {
    process.exitCode = run();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
