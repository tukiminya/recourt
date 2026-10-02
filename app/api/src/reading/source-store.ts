import { db, eq, lt, reading_sources } from "@recourt/database";
import type { ExtractedArticle } from "./article-browser";

const SOURCE_LIFETIME_MS = 60 * 60 * 1_000;

export type ReadingSource = typeof reading_sources.$inferSelect;

export function createReadingSourceStore(connectionString: string) {
  async function withConnection<T>(query: (database: ReturnType<typeof db>) => Promise<T>): Promise<T> {
    const database = db(connectionString);
    try {
      return await query(database);
    } finally {
      await database.$client.end();
    }
  }

  return {
    async create(article: ExtractedArticle): Promise<ReadingSource> {
      const fetchedAt = new Date();
      const [source] = await withConnection((database) => database
        .insert(reading_sources)
        .values({
          id: crypto.randomUUID(),
          requested_url: article.requestedUrl,
          source_url: article.sourceUrl,
          title: article.title,
          content: article.content,
          fetched_at: fetchedAt,
          expires_at: new Date(fetchedAt.getTime() + SOURCE_LIFETIME_MS),
        })
        .returning());
      return source;
    },

    async get(id: string): Promise<ReadingSource | null> {
      const [source] = await withConnection((database) => database
        .select()
        .from(reading_sources)
        .where(eq(reading_sources.id, id))
        .limit(1));
      return source ?? null;
    },

    async delete(id: string): Promise<void> {
      await withConnection((database) => database.delete(reading_sources).where(eq(reading_sources.id, id)));
    },

    async purgeExpired(): Promise<void> {
      await withConnection((database) => database.delete(reading_sources).where(lt(reading_sources.expires_at, new Date())));
    },
  };
}
