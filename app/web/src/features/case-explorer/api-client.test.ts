import { describe, expect, it, vi } from "vitest";
import { consumeCaseStream } from "./api-client";
const paragraph = { kind: "explanation", text: "説明", citations: [] };
describe("case SSE client", () => {
  it("reads split paragraphs and requires completion", async () => {
    const data = `event: paragraph\ndata: ${JSON.stringify(paragraph)}\n\nevent: done\ndata: {}\n\n`;
    const response = new Response(
      new ReadableStream({
        start(controller) {
          const bytes = new TextEncoder().encode(data);
          controller.enqueue(bytes.slice(0, 45));
          controller.enqueue(bytes.slice(45));
          controller.close();
        },
      }),
    );
    const receive = vi.fn();
    expect(await consumeCaseStream(response, receive)).toEqual([paragraph]);
    expect(receive).toHaveBeenCalledWith(paragraph);
    await expect(
      consumeCaseStream(
        new Response(`event: paragraph\ndata: ${JSON.stringify(paragraph)}\n\n`),
        vi.fn(),
      ),
    ).rejects.toThrow(/途中/);
  });
  it("surfaces server generation failure for retry", async () => {
    await expect(
      consumeCaseStream(
        new Response(
          'event: error\ndata: {"code":"GENERATION_FAILED","message":"再試行してください"}\n\n',
        ),
        vi.fn(),
      ),
    ).rejects.toThrow("再試行してください");
  });
});
