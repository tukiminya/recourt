import z from "zod";
import { block } from "./block";

export const section = z.object({
  key: z.string().min(1),
  title: z.string(),
  blocks: z.array(block),
});
