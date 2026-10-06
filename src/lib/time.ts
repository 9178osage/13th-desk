import { tr, type Lang } from "@/lib/text";
import { VI_SHORT_WEEKDAYS } from "@/lib/desk-copy";

export const TERM_START = "2026-09-28";
export const TERM_END = "2026-12-11";
export const K12_EARLY = "2026-09-08";
export const K12_START = "2026-09-09";
export const K12_END = "2027-06-16";

export type EugeneClock = {
  ymd: string;
  weekday: number;
  minutes: number;
  month: number;
  hour: number;
};

const WEEKDAY: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function eugeneClock(now = new Date()): EugeneClock {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(now).map((part) => [part.type, part.value]),
  );
  let hour = Number(parts.hour);
  if (hour === 24) hour = 0;
  return {
    ymd: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: WEEKDAY[parts.weekday] ?? 0,
    minutes: hour * 60 + Number(parts.minute),
    month: Number(parts.month),
    hour,
  };
}

export function daysBetween(fromYmd: string, toYmd: string): number {
  const start = Date.parse(`${fromYmd}T12:00:00-07:00`);
  const end = Date.parse(`${toYmd}T12:00:00-07:00`);
  return Math.round((end - start) / 86_400_000);
}

export type TermPhase =
  | { kind: "before"; daysUntil: number }
  | { kind: "during"; day: number; week: number }
  | { kind: "after" };

function mondayOrdinal(ymd: string): number {
  const ms = Date.parse(`${ymd}T12:00:00-07:00`);
  const dow = new Date(ms).getUTCDay();
  const sinceMonday = dow === 0 ? 6 : dow - 1;
  return Math.round(ms / 86_400_000) - sinceMonday;
}

export function spanPhase(ymd: string, start: string, end: string): TermPhase {
  if (ymd < start) return { kind: "before", daysUntil: daysBetween(ymd, start) };
  if (ymd > end) return { kind: "after" };
  const day = daysBetween(start, ymd) + 1;
  const week = Math.round((mondayOrdinal(ymd) - mondayOrdinal(start)) / 7) + 1;
  return { kind: "during", day, week: Math.max(1, week) };
}

export function termPhase(ymd: string): TermPhase {
  return spanPhase(ymd, TERM_START, TERM_END);
}

const LOCALE: Record<Lang, string> = {
  en: "en-US",
  zh: "zh-CN",
  es: "es",
  ko: "ko",
  vi: "vi",
  ja: "ja",
};

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function localeDate(lang: Lang, options: Intl.DateTimeFormatOptions, date: Date): string {
  const fmt = new Intl.DateTimeFormat(LOCALE[lang], options);
  if (lang !== "vi" || options.weekday !== "short") return fmt.format(date);
  // Same server/browser ICU mismatch as dayName(): pin the Vietnamese weekday.
  const en = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: options.timeZone });
  const weekday = VI_SHORT_WEEKDAYS[WEEKDAY_INDEX[en.format(date)] ?? 0];
  return fmt
    .formatToParts(date)
    .map((part) => (part.type === "weekday" ? weekday : part.value))
    .join("");
}

export function formatWhen(ymd: string, today: string, lang: Lang): string {
  const delta = daysBetween(today, ymd);
  if (delta === 0) return tr(lang, { en: "Today", zh: "今天" });
  if (delta === 1) return tr(lang, { en: "Tomorrow", zh: "明天" });
  return localeDate(
    lang,
    { timeZone: "America/Los_Angeles", weekday: "short", month: "short", day: "numeric" },
    new Date(`${ymd}T12:00:00-07:00`),
  );
}

export function formatDateline(now: Date, lang: Lang): string {
  return localeDate(
    lang,
    { timeZone: "America/Los_Angeles", weekday: "long", month: "long", day: "numeric" },
    now,
  );
}

export function hmToMin(hm: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hm);
  if (!match) return Number.NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}
