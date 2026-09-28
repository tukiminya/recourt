import type { UUIDv7 } from "@recourt/types";
import { uuidv7 } from "@recourt/utils";
import { uuid } from "drizzle-orm/cockroach-core";

export const drizzleUuidColmns = () => uuid().$type<UUIDv7>();

export const drizzleUuidColmnsWithDefault = () => drizzleUuidColmns().$defaultFn(() => uuidv7());
