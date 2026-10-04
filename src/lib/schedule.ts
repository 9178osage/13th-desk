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
export function hasScheduleOverlap(
  schedule: ScheduleBlock[],
  row: ScheduleDraft,
  exceptId?: string,
) {
  return (
    validScheduleTime(row.start, row.end) &&
    schedule.some(
      (item) =>
        item.id !== exceptId &&
        item.day === row.day &&
        item.start < row.end &&
        row.start < item.end,
    )
  );
}
