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
