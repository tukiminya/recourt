export type EraName = "showa" | "heisei" | "reiwa";

type Era = {
  name: EraName;
  ja_display: string;
};

export const era: Era[] = [
  {
    name: "showa",
    ja_display: "昭和",
  },
  {
    name: "heisei",
    ja_display: "平成",
  },
  {
    name: "reiwa",
    ja_display: "令和",
  },
] as const;

export const eraName = era.map((obj) => obj.name);
