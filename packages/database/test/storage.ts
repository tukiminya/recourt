import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { getPlatformProxy, unstable_splitSqlQuery } from "wrangler";

export async function openTestStorage() {
  const platform = await getPlatformProxy<{
    DB: D1Database;
    CASE_DOCUMENTS: R2Bucket;
  }>({
    configPath: fileURLToPath(new URL("../../../app/internal/wrangler.jsonc", import.meta.url)),
    persist: false,
    remoteBindings: false,
  });
  try {
    const migrations = new URL("../d1-migrations/", import.meta.url);
    for (const directory of (await readdir(migrations, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()) {
      const sql = await readFile(new URL(`${directory}/migration.sql`, migrations), "utf8");
      await platform.env.DB.batch(unstable_splitSqlQuery(sql).map((query) => platform.env.DB.prepare(query)));
    }
    return platform;
  } catch (error) {
    await platform.dispose();
    throw error;
  }
}
