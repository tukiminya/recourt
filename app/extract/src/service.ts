import { NonRetryableError } from "cloudflare:workflows";
import type { z } from "zod";

export async function readServiceJson<T extends z.ZodType>(
  response: Response,
  schema: T,
  operation: string,
): Promise<z.infer<T>> {
  if (!response.ok) {
    const message = `${operation} returned HTTP ${response.status}`;
    if (response.status >= 400 && response.status < 500 && response.status !== 429) {
      throw new NonRetryableError(message);
    }
    throw new Error(message);
  }
  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) throw new NonRetryableError(`${operation} returned an invalid response`);
  return parsed.data;
}
