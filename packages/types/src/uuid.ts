import z from "zod";

export const uuidv7 = z.uuidv7().brand("uuidv7");
export type UUIDv7 = z.infer<typeof uuidv7>;
