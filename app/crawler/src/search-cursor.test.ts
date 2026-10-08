import { expect, it } from "vitest";
import { cursorAfterPage } from "./search-cursor";
it("retains unprocessed rows when the cap is smaller than a court page", () => {
  expect(cursorAfterPage(0, 30, 30, 0, 17)).toEqual({ offset: 0, skip: 17 });
  expect(cursorAfterPage(0, 30, 30, 17, 13)).toEqual({ offset: 30, skip: 0 });
  expect(cursorAfterPage(30, 4, null, 0, 4)).toEqual({ offset: null, skip: 0 });
});
