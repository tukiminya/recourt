import { expect, test, vi } from "vite-plus/test";
import { uuidv7 } from "./uuid";

vi.mock(import("uuid"), () => ({
  v7: vi.fn(() => "0b8f111a-52e6-79ff-9815-d58da2b58efc"),
}));

test("uuidv7 function return UUIDv7 correctly", () => {
  expect(uuidv7()).toBe("0b8f111a-52e6-79ff-9815-d58da2b58efc");
});
