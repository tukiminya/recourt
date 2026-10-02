export type ChatEvent =
  | { event: "delta"; data: { text: string } }
  | { event: "done"; data: Record<string, never> }
  | { event: "error"; data: { message: string } };
