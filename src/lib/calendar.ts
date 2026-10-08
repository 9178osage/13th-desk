import {
  UO_LAST_VERIFIED,
  UO_SOURCE_HREF,
  UO_TERM_ID,
  UO_VALID_THROUGH,
  k12CalendarSourceMeta,
  termExpiredByValidThrough,
  type CalendarSourceMeta,
} from "./calendar-meta.ts";
import type { Deadline } from "../data/guide.ts";
import { deadlines as uniDeadlines } from "../data/guide.ts";
import { deadlinesFor as k12DeadlinesFor } from "../data/k12.ts";
import type { DistrictId } from "../data/districts.ts";
import type { Level } from "./levels.ts";
import type { Copy } from "./text.ts";
import { eugeneClock, hmToMin, type EugeneClock } from "./time.ts";

export function deadlinePassed(
  item: { ymd: string; time?: string },
  clock: EugeneClock,
) {
  if (item.ymd > clock.ymd) return false;
  if (item.ymd < clock.ymd) return true;
  if (!item.time) return false;
  return clock.minutes >= hmToMin(item.time);
}

/** UO term snapshot — update these fields each term (see README / REDESIGN). */
export const uoAcademicTerm = {
  id: UO_TERM_ID,
  label: {
    en: "UO Fall 2026",
    zh: "UO 2026 秋季",
    es: "UO otoño 2026",
    ko: "UO 2026 가을",
    vi: "UO mùa thu 2026",
    ja: "UO 2026年秋",
  } satisfies Copy,
  /** Inclusive last day this hard-coded list is meant to cover (finals end). */
  validThrough: UO_VALID_THROUGH,
  lastVerified: UO_LAST_VERIFIED,
  sourceHref: UO_SOURCE_HREF,
  sourceLabel: {
    en: "UO catalog calendar",
    zh: "UO 校历",
    es: "Calendario del catálogo UO",
    ko: "UO 카탈로그 학사일정",
    vi: "Lịch niên khóa UO",
    ja: "UOカタログの学年暦",
  } satisfies Copy,
} as const;

export type CalendarSource = CalendarSourceMeta;

export function uoTermIsExpired(clock: EugeneClock, term = uoAcademicTerm): boolean {
  if (termExpiredByValidThrough(clock.ymd, term.validThrough)) return true;
  return uniDeadlines.every((item) => deadlinePassed(item, clock));
}

export function upcomingDeadlines(
  items: Deadline[],
  clock: EugeneClock,
  limit = 3,
): Deadline[] {
  return items
    .filter((date) => !deadlinePassed(date, clock))
    .sort((a, b) => a.ymd.localeCompare(b.ymd) || (a.time ?? "").localeCompare(b.time ?? ""))
    .slice(0, limit);
}

export function k12CalendarSource(district: DistrictId | null): CalendarSource {
  return k12CalendarSourceMeta(district);
}

/** Date rows for K12 home/guide. Empty when the selected district has no data here. */
export function k12DeadlinesForDistrict(
  level: Exclude<Level, "uni">,
  district: DistrictId | null,
): Deadline[] {
  const source = k12CalendarSource(district);
  if (!source.hasMatchingData) return [];
  return k12DeadlinesFor(level);
}

export function k12DatesExpired(
  level: Exclude<Level, "uni">,
  district: DistrictId | null,
  clock: EugeneClock,
): boolean {
  const dates = k12DeadlinesForDistrict(level, district);
  if (!dates.length) return false;
  return dates.every((item) => deadlinePassed(item, clock));
}

/** Resolve "now" for tests: prefer an injectable Date. */
export function resolveNow(fallback = new Date()): Date {
  if (typeof globalThis !== "undefined") {
    const injected = (globalThis as { __eugeneDeskNow?: Date | string | number }).__eugeneDeskNow;
    if (injected instanceof Date) return injected;
    if (typeof injected === "string" || typeof injected === "number") return new Date(injected);
  }
  return fallback;
}

export function clockFromNow(now?: Date): EugeneClock {
  return eugeneClock(now ?? resolveNow());
}

export {
  UO_VALID_THROUGH,
  UO_LAST_VERIFIED,
  k12HasStoredDates,
  referenceCalendarLabel,
  termExpiredByValidThrough,
} from "./calendar-meta.ts";
