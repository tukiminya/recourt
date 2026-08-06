import { v7 } from "uuid";
import type { UUIDv7 } from "@recourt/types";

// Use UUIDv7 brand type
export const uuidv7 = (): UUIDv7 => v7() as UUIDv7;
