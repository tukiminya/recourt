import { z } from "zod";

const text = z.string().max(200).optional();
const number = (min: number, max: number) =>
  z
    .string()
    .regex(/^\d+$/)
    .refine((value) => Number(value) >= min && Number(value) <= max);
const optionalNumber = (min: number, max: number) => number(min, max).optional();
const choices = (min: number, max: number) =>
  z
    .union([number(min, max), z.array(number(min, max)).nonempty().max(40)])
    .transform((value) => (Array.isArray(value) ? value : [value]))
    .optional();
const era = z.enum(["令和", "平成", "昭和"]).optional();

const common = {
  query1: text,
  query2: text,
  sort: z.enum(["1", "2", "3"]).optional(),
  offset: number(0, 1980)
    .refine((value) => Number(value) % 30 === 0)
    .optional(),
  "filter[judgeDateMode]": z.enum(["1", "2"]).optional(),
  "filter[judgeGengoFrom]": era,
  "filter[judgeYearFrom]": optionalNumber(1, 64),
  "filter[judgeMonthFrom]": optionalNumber(1, 12),
  "filter[judgeDayFrom]": optionalNumber(1, 31),
  "filter[judgeGengoTo]": era,
  "filter[judgeYearTo]": optionalNumber(1, 64),
  "filter[judgeMonthTo]": optionalNumber(1, 12),
  "filter[judgeDayTo]": optionalNumber(1, 31),
  "filter[jikenGengo]": era,
  "filter[jikenYear]": optionalNumber(1, 64),
  "filter[jikenCode]": optionalNumber(1, 999),
  "filter[jikenNumber]": optionalNumber(1, 999999),
};

const court = {
  "filter[courtType]": optionalNumber(1, 5),
  "filter[courtSection]": optionalNumber(1, 10),
  "filter[courtName]": text,
  "filter[branchName]": text,
};

const originalCourt = {
  "filter[genshinCourtType]": optionalNumber(1, 5),
  "filter[genshinCourtSection]": optionalNumber(1, 10),
  "filter[genshinCourtName]": text,
  "filter[genshinBranchName]": text,
};

const caseName = {
  "filter[jikenName]": text,
  "filter[jikenNameMode]": z.enum(["1", "2"]).optional(),
};

const specialized = { ...common, "filter[recent]": z.literal("1").optional() };

const checkSearchCondition = (query: Record<string, unknown>, context: z.RefinementCtx) => {
  const entries = Object.entries(query);
  const count = entries.reduce(
    (total, [, value]) => total + (Array.isArray(value) ? value.length : 1),
    0,
  );
  if (count > 40) context.addIssue({ code: "custom", message: "Too many search parameters" });
  if (
    !entries.some(
      ([key, value]) =>
        key !== "sort" &&
        key !== "offset" &&
        key !== "view" &&
        (Array.isArray(value) ? value.length > 0 : value !== "" && value !== undefined),
    )
  ) {
    context.addIssue({ code: "custom", message: "At least one search condition is required" });
  }
};

const searchQuery = <T extends z.ZodRawShape>(shape: T) =>
  z.strictObject(shape).superRefine(checkSearchCondition);

export const generalQuery = searchQuery({ ...common, ...court });
export const saikosaiQuery = searchQuery({
  ...specialized,
  ...originalCourt,
  ...caseName,
  "filter[reportV1]": text,
  "filter[reportI1]": text,
  "filter[reportP1]": text,
  "filter[reportI2]": text,
  "filter[reportP2]": text,
  "filter[precedentMode]": z.enum(["1", "2"]).optional(),
  "filter[division][]": choices(1, 2),
  "filter[houtei][]": choices(1, 4),
  "filter[judgeType][]": choices(1, 2),
  "filter[judgeResult][]": choices(1, 5),
  "filter[genshinJudgeDateMode]": z.enum(["1", "2"]).optional(),
  "filter[genshinJudgeGengoFrom]": era,
  "filter[genshinJudgeYearFrom]": optionalNumber(1, 64),
  "filter[genshinJudgeMonthFrom]": optionalNumber(1, 12),
  "filter[genshinJudgeDayFrom]": optionalNumber(1, 31),
  "filter[genshinJudgeGengoTo]": era,
  "filter[genshinJudgeYearTo]": optionalNumber(1, 64),
  "filter[genshinJudgeMonthTo]": optionalNumber(1, 12),
  "filter[genshinJudgeDayTo]": optionalNumber(1, 31),
  "filter[reference]": text,
  "filter[referenceMode]": z.enum(["1", "2"]).optional(),
  "filter[note_1_1]": text,
  "filter[note_1_2]": text,
  "filter[point1]": text,
  "filter[point2]": text,
});
export const kosaiQuery = searchQuery({
  ...specialized,
  "filter[courtName]": text,
  "filter[branchName]": text,
  ...caseName,
  "filter[reportV1]": text,
  "filter[reportI1]": text,
  "filter[reportP1]": text,
});
export const kakyusaiQuery = searchQuery({ ...specialized, ...court });
export const gyoseiQuery = searchQuery({
  ...specialized,
  ...court,
  ...caseName,
  "filter[caseType][]": choices(1, 9),
});
export const rodoQuery = searchQuery({ ...specialized, ...court, ...caseName });
export const chizaiQuery = z.union([
  searchQuery({
    ...specialized,
    view: z.literal("main").optional(),
    ...court,
    "filter[rightType][]": choices(1, 7),
    "filter[suitType][]": choices(1, 3),
  }),
  searchQuery({
    ...specialized,
    view: z.literal("chizai"),
    ...originalCourt,
    "filter[genshinJikenGengo]": era,
    "filter[genshinJikenYear]": optionalNumber(1, 64),
    "filter[genshinJikenCode]": optionalNumber(1, 999),
    "filter[genshinJikenNumber]": optionalNumber(1, 999999),
    "filter[chizaiJudgeResult]": optionalNumber(1, 20),
    "filter[chizaiCaseType][]": choices(1, 3),
    "filter[shinketsu]": optionalNumber(1, 11),
    "filter[chizaiRightType][]": choices(1, 7),
    "filter[appeal][]": choices(1, 3),
    "filter[appealResult]": optionalNumber(1, 7),
  }),
]);

export const courtSearchCategory = z.enum([
  "general",
  "saikosai",
  "kosai",
  "kakyusai",
  "gyosei",
  "rodo",
  "chizai",
]);
export type CourtSearchCategory = z.infer<typeof courtSearchCategory>;
export const courtSearchQuerySchemas = {
  general: generalQuery,
  saikosai: saikosaiQuery,
  kosai: kosaiQuery,
  kakyusai: kakyusaiQuery,
  gyosei: gyoseiQuery,
  rodo: rodoQuery,
  chizai: chizaiQuery,
} as const;
