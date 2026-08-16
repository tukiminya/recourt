import { mkdir, writeFile } from "node:fs/promises";
import { LatestCaseArticleStorage } from "../entry";

async function createFile() {
  const jsonSchema = LatestCaseArticleStorage.toJSONSchema();

  await mkdir("./dist", { recursive: true });

  await writeFile("./dist/latest-case-json-schema.json", JSON.stringify(jsonSchema, null, 2));
}

await createFile();
