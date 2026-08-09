import z from "zod";

export const entity_id = z.templateLiteral([
  z.enum(["statute", "case", "person", "organization", "legal_term", "source"]),
  ":",
  z.string().regex(/^[a-z0-9-]+$/),
]);
