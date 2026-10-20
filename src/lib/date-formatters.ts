import { LOCALE } from "./locale.ts";
import type { Lang } from "./text.ts";

const EUGENE_TIME_ZONE = "America/Los_Angeles";
const PRESETS = {
  clock: {
    timeZone: EUGENE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  },
  when: { timeZone: EUGENE_TIME_ZONE, weekday: "short", month: "short", day: "numeric" },
  dateline: { timeZone: EUGENE_TIME_ZONE, weekday: "long", month: "long", day: "numeric" },
  eugeneWeekday: { timeZone: EUGENE_TIME_ZONE, weekday: "short" },
  weekday: { timeZone: "UTC", weekday: "short" },
  month: { timeZone: "UTC", month: "short" },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

type DatePreset = keyof typeof PRESETS;
// Only six languages and six fixed presets can enter this cache. Reuse stateless
// formatters, never dates or a visitor's current language, including across SSR requests.
const formatters = new Map<string, Intl.DateTimeFormat>();

export function dateFormatter(lang: Lang, preset: DatePreset): Intl.DateTimeFormat {
  const key = `${lang}:${preset}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(LOCALE[lang], PRESETS[preset]);
    formatters.set(key, formatter);
  }
  return formatter;
}
