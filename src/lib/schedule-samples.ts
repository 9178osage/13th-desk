// Relative + `.ts` imports: loaded by the node test runner (desk.test.ts).
import type { Level } from "./levels.ts";

export type SampleSlot = {
  day: "mon" | "tue" | "wed" | "thu" | "fri";
  start: string;
  end: string;
  /** 1-based sample course number, shown as "Sample class {n}". */
  n: number;
};

const week = (days: SampleSlot["day"][], start: string, end: string, n: number): SampleSlot[] =>
  days.map((day) => ({ day, start, end, n }));

/**
 * Two editable sample courses for an empty week, on the level's usual rhythm:
 * UO MWF 50-minute / TTh 80-minute blocks; 4J school-day starts (high 8:30,
 * middle 9:00, elementary 8:30), skipping the short Wednesday.
 */
export function sampleSlots(level: Level): SampleSlot[] {
  if (level === "uni") {
    return [
      ...week(["mon", "wed", "fri"], "10:00", "10:50", 1),
      ...week(["tue", "thu"], "10:00", "11:20", 2),
    ];
  }
  const start = level === "mid" ? "09:00" : "08:30";
  const end = level === "mid" ? "09:50" : level === "high" ? "09:55" : "09:30";
  return [...week(["mon", "thu"], start, end, 1), ...week(["tue", "fri"], start, end, 2)];
}
