import { normalizeText } from "./normalize.js";

const INCIDENT_PATTERN = /^(令和|平成|昭和)(\d+)\(([^)]+)\)(\d+)$/;

export type IncidentEra = "令和" | "平成" | "昭和";

export interface ParsedIncident {
  raw_text: string;
  incident_era: IncidentEra;
  incident_year: number;
  incident_category_code: string;
  incident_number: number;
}

export const parseCourtIncidentId = (value: string): ParsedIncident | null => {
  const normalized = normalizeText(value)
    .replace(/\s+/g, "")
    .replace(/[（）]/g, (char) => (char === "（" ? "(" : ")"));
  const match = normalized.match(INCIDENT_PATTERN);
  if (!match) {
    return null;
  }

  const incidentEra = match[1] as IncidentEra;
  const incidentYear = Number(match[2]);
  const incidentCategoryCode = match[3];
  const incidentNumber = Number(match[4]);

  if (!Number.isFinite(incidentYear) || !Number.isFinite(incidentNumber)) {
    return null;
  }

  return {
    raw_text: value,
    incident_era: incidentEra,
    incident_year: incidentYear,
    incident_category_code: incidentCategoryCode,
    incident_number: incidentNumber,
  };
};
