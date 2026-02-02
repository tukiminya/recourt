import dayjs from "dayjs";

const BASE_URL = "https://www.courts.go.jp/hanrei/search2/index.html";

export const validGengo = [
  {
    jaValue: "令和",
    enValue: "Reiwa",
    code: "R",
  },
  {
    jaValue: "平成",
    enValue: "Heisei",
    code: "H",
  },
  {
    jaValue: "昭和",
    enValue: "Showa",
    code: "S",
  },
];

export type ValidGengoJa = (typeof validGengo)[number]["jaValue"];

export interface JapaneseEraDate {
  gengo: ValidGengoJa;
  year: number;
  month: number;
  day: number;
}

export interface CourtSearchFilterParams {
  // 裁判年月日
  judgeDateMode: 1 | 2; // 1: 日時指定, 2: 範囲指定
  judgeGengoFrom: ValidGengoJa;
  judgeYearFrom: number;
  judgeMonthFrom: number;
  judgeDayFrom: number;
  judgeGengoTo?: ValidGengoJa;
  judgeYearTo?: number;
  judgeMonthTo?: number;
  judgeDayTo?: number;
  // 事件番号
  jikenGengo?: ValidGengoJa;
  jikenYear?: number;
  jikenCode?: string;
  jikenNumber?: number;
}

export interface CourtSearchParams {
  // courtCaseType: "1";
  query1?: string; // 全文検索
  query2?: string; // 全文検索のさらに絞り込むためのキーワード
  filter: CourtSearchFilterParams;
  offset?: number;
}

const toDate = (input: Date | string) => {
  const value = dayjs(input);
  if (!value.isValid()) {
    throw new Error(`Invalid date: ${input}`);
  }
  return value.toDate();
};

const getEraForDate = (date: Date): JapaneseEraDate => {
  const reiwaStart = new Date("2019-05-01");
  const heiseiStart = new Date("1989-01-08");
  const showaStart = new Date("1926-12-25");

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if (date >= reiwaStart) {
    return { gengo: "令和", year: year - 2018, month, day };
  }
  if (date >= heiseiStart) {
    return { gengo: "平成", year: year - 1988, month, day };
  }
  if (date >= showaStart) {
    return { gengo: "昭和", year: year - 1925, month, day };
  }

  throw new Error("Date is before supported eras (S/H/R)");
};

/**
 * 西暦日付を裁判所検索向けの和暦情報に変換する。
 */
export const toJapaneseEra = (input: Date | string): JapaneseEraDate => {
  return getEraForDate(toDate(input));
};

/**
 * 判決日範囲のフィルタをまとめて生成する。
 */
export const buildJudgeDateRangeFilter = (
  start: Date | string,
  end?: Date | string,
): CourtSearchFilterParams => {
  const from = getEraForDate(toDate(start));
  const to = end ? getEraForDate(toDate(end)) : undefined;

  return {
    judgeDateMode: to ? 2 : 1,
    judgeGengoFrom: from.gengo,
    judgeYearFrom: from.year,
    judgeMonthFrom: from.month,
    judgeDayFrom: from.day,
    judgeGengoTo: to?.gengo,
    judgeYearTo: to?.year,
    judgeMonthTo: to?.month,
    judgeDayTo: to?.day,
  };
};

/**
 * 最高裁検索画面のURLを組み立てる。
 */
export const generateCourtSearchUrl = (params: CourtSearchParams) => {
  const url = new URL(BASE_URL);
  const search = url.searchParams;

  search.set("query1", params.query1 ?? "");
  search.set("query2", params.query2 ?? "");
  search.set("courtCaseType", "1");

  if (params.filter) {
    for (const [key, value] of Object.entries(params.filter)) {
      if (value === undefined || value === null) {
        continue;
      }
      search.set(`filter[${key}]`, String(value));
    }
  }

  if (params.offset) {
    search.set("offset", String(params.offset));
  }

  return url.toString();
};
