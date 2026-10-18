/** Creation limits, not read/merge limits: never discard already saved items. */
export const DESK_LIMITS = { notes: 20, grades: 40, schedule: 40, favs: 80, checks: 40 } as const;

export function hasDeskOverflow(
  buckets: Record<string, Record<keyof typeof DESK_LIMITS, unknown[]>>,
): boolean {
  return Object.values(buckets).some((bucket) =>
    (Object.keys(DESK_LIMITS) as (keyof typeof DESK_LIMITS)[]).some(
      (key) => bucket[key].length > DESK_LIMITS[key],
    ),
  );
}

/**
 * Undo of a delete puts back an item that was just there, so a list that is back at
 * its limit (another item was added after the delete) still accepts it. Only a list
 * already over the limit, or an id that is already present, refuses. Adding uses
 * `>=`; restoring uses `>`.
 */
export function canRestore(
  list: { id: string }[],
  id: string,
  key: "notes" | "schedule" | "grades",
): boolean {
  return list.length <= DESK_LIMITS[key] && !list.some((item) => item.id === id);
}
