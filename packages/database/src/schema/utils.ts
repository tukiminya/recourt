import type { UUIDv7 } from "@recourt/types";
import { uuidv7 } from "@recourt/utils";
import { sql } from "drizzle-orm";
import { integer, text } from "drizzle-orm/sqlite-core";

export const uuidV7Column = () => text().$type<UUIDv7>();
export const uuidV7ColumnWithDefault = () => uuidV7Column().$defaultFn(uuidv7);

export const databaseTimeMs = sql`(cast(round(unixepoch('subsec') * 1000) as integer))`;
export const dateColumn = () => integer({ mode: "timestamp_ms" });
