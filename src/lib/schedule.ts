import type { ScheduleBlock, WeekDay } from "./store";

export type ScheduleDraft = Pick<ScheduleBlock, "day" | "start" | "end" | "title" | "place">;
export function validScheduleTime(start: string, end: string): boolean {
  const hm = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  return hm.test(start) && hm.test(end) && end > start;
}
export function scheduleForDay(schedule: ScheduleBlock[], day: WeekDay | null) {
  return schedule.filter((item) => item.day === day).sort((a, b) => a.start.localeCompare(b.start));
}
export function nextClass(schedule: ScheduleBlock[], day: WeekDay | null, minutes: number) {
  return (
    scheduleForDay(schedule, day).find((item) => {
      const [h, m] = item.end.split(":").map(Number);
      return validScheduleTime(item.start, item.end) && h * 60 + m > minutes;
    }) ?? null
  );
}
/** Classes that overlap the draft on the same day. Adjacent times (10:00 ends, 10:00 starts) are not conflicts. */
export function overlappingClasses(
  schedule: ScheduleBlock[],
  row: ScheduleDraft,
  exceptId?: string,
): ScheduleBlock[] {
  if (!validScheduleTime(row.start, row.end)) return [];
  return schedule.filter(
    (item) =>
      item.id !== exceptId &&
      item.day === row.day &&
      validScheduleTime(item.start, item.end) &&
      item.start < row.end &&
      row.start < item.end,
  );
}
export function hasScheduleOverlap(
  schedule: ScheduleBlock[],
  row: ScheduleDraft,
  exceptId?: string,
) {
  return overlappingClasses(schedule, row, exceptId).length > 0;
}
/** Ids of classes that overlap at least one other class in the same stage. */
export function conflictingClassIds(schedule: ScheduleBlock[]): Set<string> {
  const ids = new Set<string>();
  for (let i = 0; i < schedule.length; i++) {
    const a = schedule[i];
    if (!validScheduleTime(a.start, a.end)) continue;
    for (let j = i + 1; j < schedule.length; j++) {
      const b = schedule[j];
      if (a.day !== b.day || !validScheduleTime(b.start, b.end)) continue;
      if (a.start < b.end && b.start < a.end) {
        ids.add(a.id);
        ids.add(b.id);
      }
    }
  }
  return ids;
}
