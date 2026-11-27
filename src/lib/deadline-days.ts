/**
 * When a dated entry is over. Kept free of app imports so the node tests can load it.
 */
type DayClock = { ymd: string; minutes: number };

function minutesOf(hm: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hm);
  return match ? Number(match[1]) * 60 + Number(match[2]) : Number.NaN;
}

/** The last day an entry covers: its `endYmd` for a multi-day break, else its own day. */
export function lastDayOf(item: { ymd: string; endYmd?: string }): string {
  return item.endYmd && item.endYmd > item.ymd ? item.endYmd : item.ymd;
}

/**
 * Over once its last day is over (a break stays listed through its final day), or for a
 * timed single-day entry, once that time has come.
 */
export function deadlinePassed(
  item: { ymd: string; endYmd?: string; time?: string },
  clock: DayClock,
) {
  const last = lastDayOf(item);
  if (last > clock.ymd) return false;
  if (last < clock.ymd) return true;
  if (!item.time || last !== item.ymd) return false;
  return clock.minutes >= minutesOf(item.time);
}
