import { load } from "cheerio";

import { createDatabase, incident_categories, runMigrations } from "@scpv/database";

const INCIDENT_CATEGORIES_URL = "https://www.courts.go.jp/hanrei/search2/index.html";

// TODO: Set the selector for the category options.
// Example:
// const optionSelector = "select[name='filter[jikenCode]'] option";
const optionSelector = "#jikenCodeModal-1 .module-sub-page-parts-table dl";

const required = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
};

const fetchHtml = async () => {
  const response = await fetch(INCIDENT_CATEGORIES_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch incident categories: ${response.status}`);
  }
  return response.text();
};

const parseIncidentCategories = (html: string) => {
  if (!optionSelector) {
    throw new Error("Option selector is not set.");
  }

  const $ = load(html);
  const options = $(optionSelector);
  if (!options.length) {
    throw new Error(`No options found for selector: ${optionSelector}`);
  }

  const byCode = new Map<string, { code: string; label: string }>();
  options.each((_, element) => {
    const code = $(element).children("dt").text().trim();
    const label = $(element).children("dd").text().trim();
    if (!code || !label) {
      return;
    }
    byCode.set(code, { code, label });
  });

  return [...byCode.values()];
};

const run = async () => {
  const db = createDatabase({
    url: required("TURSO_DATABASE_URL"),
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  await runMigrations(db);

  const html = await fetchHtml();
  const categories = parseIncidentCategories(html);

  for (const category of categories) {
    await db
      .insert(incident_categories)
      .values({
        code: category.code,
        label: category.label,
        description: null,
        active_from: null,
        active_to: null,
      })
      .onConflictDoUpdate({
        target: incident_categories.code,
        set: {
          label: category.label,
        },
      })
      .run();
  }

  console.log(`Synced ${categories.length} incident categories.`);
};

run().catch((error) => {
  console.error("incident category sync failed", error);
  process.exitCode = 1;
});
