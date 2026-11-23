import { drizzle, type AnyD1Database } from "drizzle-orm/d1";

export const db = (binding: AnyD1Database) => drizzle(binding);
