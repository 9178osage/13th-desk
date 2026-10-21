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
  let next: ScheduleBlock | null = null;
  for (const item of schedule) {
    if (item.day !== day || !validScheduleTime(item.start, item.end)) continue;
    const [h, m] = item.end.split(":").map(Number);
    // Strictly earlier keeps the original first row when start times are tied,
    // matching the stable sort without allocating or sorting another daily list.
    if (h * 60 + m > minutes && (!next || item.start < next.start)) next = item;
  }
  return next;
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
/** Classes that overlap at least one other class in the same stage, by row identity. */
export function conflictingClasses(schedule: ScheduleBlock[]): Set<ScheduleBlock> {
  const rows = new Set<ScheduleBlock>();
  for (let i = 0; i < schedule.length; i++) {
    const a = schedule[i];
    if (!validScheduleTime(a.start, a.end)) continue;
    for (let j = i + 1; j < schedule.length; j++) {
      const b = schedule[j];
      if (a.day !== b.day || !validScheduleTime(b.start, b.end)) continue;
      if (a.start < b.end && b.start < a.end) {
        // Identity, not id: duplicate/blank ids are accepted on import, and an id-only
        // set would put the badge on every row that shares it.
        rows.add(a);
        rows.add(b);
      }
    }
  }
  return rows;
}

/** Ids of classes that overlap at least one other class in the same stage. */
export function conflictingClassIds(schedule: ScheduleBlock[]): Set<string> {
  return new Set([...conflictingClasses(schedule)].map((row) => row.id));
}
