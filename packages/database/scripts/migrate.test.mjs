import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { readEnvironment, validateDatabaseUrl } from "./migrate.mjs";

const script = fileURLToPath(new URL("./migrate.mjs", import.meta.url));
function invoke(args, databaseUrl = "") {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: tmpdir(),
    env: { ...process.env, DB_URL: databaseUrl },
    encoding: "utf8",
    timeout: 10_000,
  });
}

test("loads quoted dotenv values while preserving explicitly supplied environment variables", () => {
  const directory = mkdtempSync(join(tmpdir(), "recourt-migration-env-"));
  try {
    const file = join(directory, ".env");
    writeFileSync(
      file,
      'DB_URL="postgresql://local@localhost:26257/local?sslmode=disable"\nLABEL="with # a hash"\n',
    );
    const loaded = readEnvironment(file, { DB_URL: "postgresql://ci@localhost:26257/ci" });
    assert.equal(loaded.DB_URL, "postgresql://ci@localhost:26257/ci");
    assert.equal(loaded.LABEL, "with # a hash");
    assert.equal(
      readEnvironment(file, {}).DB_URL,
      "postgresql://local@localhost:26257/local?sslmode=disable",
    );
    assert.deepEqual(readEnvironment(join(directory, "missing"), {}), {});
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("accepts CockroachDB URLs and rejects missing, malformed or non-PostgreSQL targets without exposing credentials", () => {
  validateDatabaseUrl("postgresql://root@127.0.0.1:26257/recourt?sslmode=disable");
  validateDatabaseUrl("postgres://user:password@db.example.com:26257/recourt?sslmode=verify-full");
  assert.throws(() => validateDatabaseUrl(""), /DB_URL が未設定/);
  for (const value of [
    "https://user:secret@example.com/db",
    "postgresql://user:secret@localhost",
    "secret",
  ]) {
    assert.throws(
      () => validateDatabaseUrl(value),
      (error) => {
        assert.match(error.message, /PostgreSQL/);
        assert.doesNotMatch(error.message, /secret/);
        return true;
      },
    );
  }
});

test("dry-run finds the repository migrations from a different working directory without a DB URL", () => {
  const result = invoke(["--dry-run"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /20261002061649_round_the_renegades/);
  assert.match(result.stdout, /20261106132701_review_reflections/);
  assert.match(result.stdout, /DBへの接続・適用は行っていません/);
});

test("help needs no database and unknown arguments fail before connecting", () => {
  assert.equal(invoke(["--help"]).status, 0);
  const result = invoke(["--ignore-conflicts"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /使用方法/);
});

test("missing DB_URL fails before invoking Drizzle", () => {
  const result = invoke([]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /DB_URL が未設定/);
  assert.doesNotMatch(result.stdout, /Reading config/);
});

test("propagates a Drizzle connection failure as a non-zero exit code", () => {
  // The closed local port cannot be a real application database.
  const result = invoke(
    [],
    "postgresql://test@127.0.0.1:1/recourt_migration_test?connect_timeout=1&sslmode=disable",
  );
  assert.ifError(result.error);
  assert.equal(result.status, 1, result.stdout);
  assert.match(`${result.stdout}${result.stderr}`, /ECONNREFUSED|EPERM|EACCES/);
});
