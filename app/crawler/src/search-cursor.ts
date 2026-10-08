import { z } from "zod";
export const searchCursor = z.object({
  offset: z.number().int().min(0).max(1980).nullable(),
  skip: z.number().int().min(0).max(30),
});
export const emptyCursor = { offset: 0, skip: 0 };
export function cursorAfterPage(
  offset: number,
  pageLength: number,
  nextOffset: number | null,
  skip: number,
  enqueued: number,
) {
  const nextSkip = skip + enqueued;
  return nextSkip < pageLength ? { offset, skip: nextSkip } : { offset: nextOffset, skip: 0 };
}
