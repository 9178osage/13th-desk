import { DESK_LIMITS } from "./desk-limits.ts";

/**
 * Saved desks may hold several rows with the same id (or an empty id): the reader and
 * the backup importer keep them verbatim on purpose. Edits, deletes and toggles
 * therefore address one row by its position, and carry the id it had so a stale
 * position (the list changed underneath) does nothing instead of hitting another row.
 */
export type RowRef = { id: string; index: number };

/** What a delete took out: enough to put exactly that row back where it was. */
export type RemovedRow<T> = { row: T; index: number; shared: boolean };

type WithId = { id: string };

/** Position of this very row (by identity) in the list, or null when it is gone. */
export function refOf<T extends WithId>(list: readonly T[], row: T): RowRef | null {
  const index = list.indexOf(row);
  return index < 0 ? null : { id: row.id, index };
}

/** The row a ref points at, only when that position still holds the expected id. */
export function rowAt<T extends WithId>(list: readonly T[], ref: RowRef | null): T | null {
  if (!ref || !Number.isInteger(ref.index) || ref.index < 0) return null;
  const row = list[ref.index];
  return row && row.id === ref.id ? row : null;
}

/** A copy with only the referenced row replaced, or null when the ref is stale. */
export function updateRow<T extends WithId>(
  list: readonly T[],
  ref: RowRef,
  change: (row: T) => T | null,
): T[] | null {
  const current = rowAt(list, ref);
  if (!current) return null;
  const next = change(current);
  if (!next) return null;
  return list.map((row, index) => (index === ref.index ? next : row));
}

/** A copy without only the referenced row, or null when the ref is stale. */
export function removeRow<T extends WithId>(
  list: readonly T[],
  ref: RowRef,
): { list: T[]; removed: RemovedRow<T> } | null {
  const row = rowAt(list, ref);
  if (!row) return null;
  const shared = list.some((item, index) => index !== ref.index && item.id === row.id);
  return {
    list: list.filter((_, index) => index !== ref.index),
    removed: { row, index: ref.index, shared },
  };
}

/**
 * Undo puts back a row that was just there. Same limits as before (a list back at its
 * limit still accepts it; one over the limit refuses) and the row must not already be
 * back. A unique id must not be present again; an id that was shared with another row
 * at delete time is expected to be present.
 */
export function canRestoreRow<T extends WithId>(
  list: readonly T[],
  removed: RemovedRow<T>,
  key: "notes" | "schedule" | "grades",
): boolean {
  if (list.length > DESK_LIMITS[key] || list.includes(removed.row)) return false;
  return removed.shared || !list.some((item) => item.id === removed.row.id);
}

/**
 * Keeps an open editor on its own row after another row at `removedIndex` was deleted.
 * Returns null when the deleted row is the one being edited (close the editor).
 */
export function shiftRefAfterRemove<R extends RowRef>(
  ref: R | null,
  removedIndex: number,
): R | null {
  if (!ref) return null;
  if (removedIndex === ref.index) return null;
  return removedIndex < ref.index ? { ...ref, index: ref.index - 1 } : ref;
}

/** Keeps an open editor on its own row after undo put a row back at `insertedIndex`. */
export function shiftRefAfterInsert<R extends RowRef>(
  ref: R | null,
  insertedIndex: number,
): R | null {
  if (!ref) return null;
  return insertedIndex <= ref.index ? { ...ref, index: ref.index + 1 } : ref;
}
