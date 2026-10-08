import { expect, it } from "vitest";
import { normalizeDecisionDate } from "./case-reading";
it("normalizes Japanese eras for date ordering, rejecting invalid dates", () => {
  expect(normalizeDecisionDate("令和元年5月1日")).toBe("2019-05-01");
  expect(normalizeDecisionDate("平成30年12月31日")).toBe("2018-12-31");
  expect(normalizeDecisionDate("昭和63年2月29日")).toBe("1988-02-29");
  expect(normalizeDecisionDate("令和7年2月29日")).toBeNull();
  expect(normalizeDecisionDate(null)).toBeNull();
});
