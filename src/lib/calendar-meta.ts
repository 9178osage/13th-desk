/** Shared with `calendar.ts`. Safe for node:test (no path aliases). */

export const UO_TERM_ID = "uo-fall-2026";
export const UO_VALID_THROUGH = "2026-12-11";
export const UO_LAST_VERIFIED = "2026-10-03";
export const UO_SOURCE_HREF = "https://catalog.uoregon.edu/calendar/";

/** Official calendar PDF/index for Eugene 4J (the only district with stored date rows). */
export const K12_4J_SOURCE_HREF = "https://www.4j.lane.edu/calendars";

/**
 * District home pages that already exist in `src/data/districts.ts`.
 * Do not invent URLs for districts whose `href` is null there.
 */
export const DISTRICT_SITE_HREF: Record<string, string> = {
  "4j": "https://www.4j.lane.edu/",
  bethel: "https://www.bethel.k12.or.us/",
  springfield: "https://www.springfield.k12.or.us/",
};

/** True when today's Eugene calendar date is past the hard-coded term window. */
export function termExpiredByValidThrough(ymd: string, validThrough = UO_VALID_THROUGH): boolean {
  return ymd > validThrough;
}

/**
 * Only Eugene 4J (or no district picked, which defaults to the 4J reference list)
 * has hard-coded K12 date rows in this repo. Do not invent other districts' dates.
 */
export function k12HasStoredDates(district: string | null): boolean {
  return district === null || district === "4j";
}

export type CalendarSourceMeta = {
  name: {
    en: string;
    zh: string;
    es: string;
    ko: string;
    vi: string;
    ja: string;
  };
  href: string | null;
  hasMatchingData: boolean;
};

export const referenceCalendarLabel = {
  en: "Reference calendar",
  zh: "参考校历",
  es: "Calendario de referencia",
  ko: "참고 학사일정",
  vi: "Lịch tham khảo",
  ja: "参考カレンダー",
} as const;

const eugene4jLabel = {
  en: "Eugene 4J",
  zh: "尤金 4J",
  es: "Eugene 4J",
  ko: "Eugene 4J",
  vi: "Eugene 4J",
  ja: "Eugene 4J",
} as const;

/** Source name/link for K12 calendars. Never names 4J when another district is selected. */
export function k12CalendarSourceMeta(district: string | null): CalendarSourceMeta {
  if (k12HasStoredDates(district)) {
    return {
      name: { ...eugene4jLabel },
      href: K12_4J_SOURCE_HREF,
      hasMatchingData: true,
    };
  }
  const href = district ? DISTRICT_SITE_HREF[district] ?? null : null;
  return {
    name: { ...referenceCalendarLabel },
    href,
    hasMatchingData: false,
  };
}
