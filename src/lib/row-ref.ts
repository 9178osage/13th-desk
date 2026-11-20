import { DESK_LIMITS } from "./desk-limits.ts";

/**
 * Edits, deletes and toggles address a row by its `id`, never by position. Every desk is
 * read through `withStableIds` (desk-records.ts), so ids are unique within each list even
 * when an older save held repeated or blank ids. A ref is that id: when the row is gone
 * (another tab deleted it, an import replaced the desk) the ref finds nothing and the
 * action does nothing, instead of landing on whichever row moved into the old position.
 */
export type RowRef = { key: string };

/** What a delete took out: enough to put exactly that row back where it was. */
export type RemovedRow<T> = { row: T; index: number };

type WithKey = { id: string };

/** Ref to this very row (by identity) in the list, or null when it is gone or has no id. */
export function refOf<T extends WithKey>(list: readonly T[], row: T): RowRef | null {
  if (!list.includes(row) || !row.id) return null;
  return { key: row.id };
}

function indexOfRef<T extends WithKey>(list: readonly T[], ref: RowRef | null): number {
  if (!ref || typeof ref.key !== "string" || !ref.key) return -1;
  return list.findIndex((row) => row.id === ref.key);
}

/** The row a ref points at, or null when no row has that id any more. */
export function rowAt<T extends WithKey>(list: readonly T[], ref: RowRef | null): T | null {
  const index = indexOfRef(list, ref);
  return index < 0 ? null : list[index];
}

/** A copy with only the referenced row replaced, or null when the ref is stale. */
export function updateRow<T extends WithKey>(
  list: readonly T[],
  ref: RowRef,
  change: (row: T) => T | null,
): T[] | null {
  const at = indexOfRef(list, ref);
  if (at < 0) return null;
  const next = change(list[at]);
  if (!next) return null;
  return list.map((row, index) => (index === at ? next : row));
}

/** A copy without only the referenced row, or null when the ref is stale. */
export function removeRow<T extends WithKey>(
  list: readonly T[],
  ref: RowRef,
): { list: T[]; removed: RemovedRow<T> } | null {
  const at = indexOfRef(list, ref);
  if (at < 0) return null;
  return {
    list: list.filter((_, index) => index !== at),
    removed: { row: list[at], index: at },
  };
}

/**
 * Undo puts back a row that was just there. Same limits as before (a list back at its
 * limit still accepts it; one over the limit refuses) and the row must not already be
 * back: no row may hold its id (another tab may have restored or re-added it).
 */
export function canRestoreRow<T extends WithKey>(
  list: readonly T[],
  removed: RemovedRow<T>,
  key: "notes" | "schedule" | "grades",
): boolean {
  if (list.length > DESK_LIMITS[key] || list.includes(removed.row)) return false;
  return !list.some((item) => item.id === removed.row.id);
}

/** An open editor closes when its own row was deleted; other deletes leave it alone. */
export function refAfterRemove<R extends RowRef>(
  ref: R | null,
  removed: RemovedRow<WithKey>,
): R | null {
  if (!ref) return null;
  return ref.key === removed.row.id ? null : ref;
}
