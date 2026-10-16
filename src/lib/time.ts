import { tr, type Lang } from "@/lib/text";
import { VI_SHORT_WEEKDAYS } from "@/lib/desk-copy";
import { LOCALE } from "@/lib/locale";

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
  const parts = Object.fromEntries(fmt.formatToParts(now).map((part) => [part.type, part.value]));
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

// Pure day math lives in days.ts so the node test runner can import it.
import { daysBetween } from "./days.ts";
export { daysBetween, soonDays } from "./days.ts";

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

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
