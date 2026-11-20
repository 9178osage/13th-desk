import { DESK_LIMITS } from "./desk-limits.ts";

/**
 * Saved desks may hold several rows with the same visible id (or an empty id): the reader
 * and the backup importer keep them verbatim on purpose. Edits, deletes and toggles
 * therefore never address a row by id or by position. Every row carries a persisted,
 * desk-wide unique `rowKey` (see `withRowKeys` in desk-records.ts), and a ref is that key.
 * When the row is gone (another tab deleted it, an import replaced the desk) a ref finds
 * nothing and the action does nothing, instead of landing on whichever row moved into
 * the old position.
 */
export type RowRef = { key: string };

/** What a delete took out: enough to put exactly that row back where it was. */
export type RemovedRow<T> = { row: T; index: number };

type WithKey = { rowKey: string };

/** Ref to this very row (by identity) in the list, or null when it is gone or unkeyed. */
export function refOf<T extends WithKey>(list: readonly T[], row: T): RowRef | null {
  if (!list.includes(row) || !row.rowKey) return null;
  return { key: row.rowKey };
}

function indexOfRef<T extends WithKey>(list: readonly T[], ref: RowRef | null): number {
  if (!ref || typeof ref.key !== "string" || !ref.key) return -1;
  return list.findIndex((row) => row.rowKey === ref.key);
}

/** The row a ref points at, or null when no row has that key any more. */
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
 * back: no row may hold its key (another tab may have restored or re-added it).
 */
export function canRestoreRow<T extends WithKey>(
  list: readonly T[],
  removed: RemovedRow<T>,
  key: "notes" | "schedule" | "grades",
): boolean {
  if (list.length > DESK_LIMITS[key] || list.includes(removed.row)) return false;
  return !list.some((item) => item.rowKey === removed.row.rowKey);
}

/** An open editor closes when its own row was deleted; other deletes leave it alone. */
export function refAfterRemove<R extends RowRef>(
  ref: R | null,
  removed: RemovedRow<WithKey>,
): R | null {
  if (!ref) return null;
  return ref.key === removed.row.rowKey ? null : ref;
}
