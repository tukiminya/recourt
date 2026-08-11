import { mkdir, writeFile } from "node:fs/promises";
import { latestCaseArticleSchema } from "../entry";

async function createFile() {
  const jsonSchema = latestCaseArticleSchema.toJSONSchema();

  await mkdir("./dist", { recursive: true });

  await writeFile("./dist/latest-case-json-schema.json", JSON.stringify(jsonSchema, null, 2));
}

await createFile();
