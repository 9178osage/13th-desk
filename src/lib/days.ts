// No `@/` imports: loaded directly by the node test runner (desk.test.ts).
/** A real YYYY-MM-DD, not Date.parse's silently rolled-over date. */
export function isCalendarDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function daysBetween(fromYmd: string, toYmd: string): number {
  const start = Date.parse(`${fromYmd}T12:00:00-07:00`);
  const end = Date.parse(`${toYmd}T12:00:00-07:00`);
  return Math.round((end - start) / 86_400_000);
}

/** Days until a date when it is 0..7 days away (today counts), else null. */
export function soonDays(todayYmd: string, ymd: string): number | null {
  const days = daysBetween(todayYmd, ymd);
  return days >= 0 && days <= 7 ? days : null;
}
