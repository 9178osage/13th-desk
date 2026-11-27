import type { PersistStorage, StorageValue } from "zustand/middleware";
import { merge3 } from "./merge3.ts";
import {
  newRecoveryId,
  wrapRecoveryCopy,
  RECOVERY_PREFIX,
  type RecoverySource,
} from "./recovery-format.ts";

/** Bump only with an explicit migration; the level/schema contract is tested. */
export const DESK_STORAGE_VERSION = 0;

/**
 * Identity marker, saved next to `version` (`{ state, version: 0, identity: 1 }`). Builds
 * that write it keep every note, grade and class id unique (`withStableIds`). Older builds
 * still read these saves (they ignore the field) but drop it when they save, so a save
 * without it that appears while this tab is open was written by an older version in
 * another tab. `version` itself stays 0 so older tabs and backups keep loading.
 */
export const DESK_IDENTITY = 1;

/**
 * Saving is paused, never resolved automatically:
 * - `old-tab`: an older version of the app saved in another tab (no identity marker);
 * - `identity`: a save that claims unique ids still needed ids changed, so which row is
 *   which cannot be trusted.
 */
export type DeskConflict = "old-tab" | "identity";

export type SaveStatus = "ready" | "failed";
export type DeskStorageEnvironment<T = unknown> = {
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  status: (status: SaveStatus) => void;
  /**
   * Called when a save had to be merged with a newer save from another tab, so
   * the in-memory desk can take the merged result. Optional for older callers.
   */
  merged?: (value: StorageValue<unknown>) => void;
  /**
   * Optional: false for a parsed save that cannot be loaded without dropping records.
   * Such a save is held exactly like unreadable JSON (no writes, failed status).
   */
  validate?: (value: unknown) => boolean;
  /**
   * Optional: applied to every parsed state (load, merge base, other tabs' saves) so that
   * all three sides of a merge use the same row ids. Must be deterministic.
   */
  normalize?: (state: T) => T;
  /**
   * Web Locks (`navigator.locks`), when the browser has them. Every tab then runs its
   * read–merge–write under one shared lock, so two tabs can never both read the same disk
   * value and overwrite each other's save. Without locks, see `CONFLICT_WINDOW_MS`.
   */
  locks?: DeskLocks | null;
  /** Clock for the no-locks conflict check and recovery-copy times; tests may inject one. */
  now?: () => number;
  /** Called after this tab wrote a recovery copy, so the copies list can refresh. */
  recoveryChanged?: () => void;
  /** Saving paused (`kind`) or resumed (`null`); see `DeskConflict`. */
  conflict?: (kind: DeskConflict | null) => void;
};

/** The one part of `LockManager` the adapter uses. */
export type DeskLocks = {
  request: (name: string, callback: () => unknown) => Promise<unknown>;
};

/** One lock name shared by every tab and every save path (edits, merges, imports). */
export const DESK_SAVE_LOCK = "13th-desk-v1:save";

/**
 * Without Web Locks, two tabs can still read the same value and write one after the
 * other. When another tab's save arrives this soon after this tab's own write and does
 * not contain that write, this tab's write is kept as a recovery copy
 * (`13th-desk-v1:recovery:…`) before the newer save is shown, so nothing is lost silently.
 */
export const CONFLICT_WINDOW_MS = 2000;

/**
 * The outer shape every reader of a saved desk value accepts: the save loader, the merge
 * paths and the recovery-copy reader all use this one check, so a value from a newer
 * version or identity scheme is never loaded (or restored and rewritten) under this
 * build's rules. Unknown values can still be downloaded as they are.
 */
export function storedEnvelopeSupported(value: unknown): value is {
  state: Record<string, unknown>;
  version?: number;
  identity?: number;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as { state?: unknown; version?: unknown; identity?: unknown };
  if (!v.state || typeof v.state !== "object" || Array.isArray(v.state)) return false;
  if (v.version !== undefined && v.version !== DESK_STORAGE_VERSION) return false;
  // A newer identity scheme than this build knows: hold it, like a newer version.
  if (v.identity !== undefined && v.identity !== DESK_IDENTITY) return false;
  return true;
}

/** Keep `raw` under the recovery prefix with when and why (see recovery-format.ts). */
function keepRecoveryCopy(
  storage: DeskStorageEnvironment["storage"],
  raw: string,
  source: RecoverySource,
  at: number,
): string {
  const key = `${RECOVERY_PREFIX}${newRecoveryId()}`;
  storage.setItem(key, wrapRecoveryCopy(raw, source, new Date(at)));
  return key;
}

/**
 * Every tab saves. Tabs stay in step through `syncFrom`, fed by the browser's
 * `storage` event. `base` is the last disk value this tab is known to match; if
 * the disk moved on before this tab's save (its event is still queued), the save
 * is merged three ways instead of blindly overwriting. With Web Locks every tab runs
 * that read–merge–write under one shared lock (`DESK_SAVE_LOCK`), so it is a cross-tab
 * transaction. Without them, a save that arrives right after this tab's own write and
 * would drop it leaves a recovery copy first (`CONFLICT_WINDOW_MS`).
 * Storage events are only a hint: `syncFrom` always reads the current disk value,
 * so a late, stale event can never roll a tab back. The saved format is still
 * `{ state, version: 0 }`. A corrupt saved desk is never overwritten until an
 * explicit, successful restore.
 */
export function createDeskStorage<T>(env: DeskStorageEnvironment<T>) {
  const name = "13th-desk-v1";
  let initialized = false;
  let readFailed = false;
  // A thrown first read (blocked/transient storage), unlike a parsed-but-unusable value,
  // is retryable: the next save reads again instead of disabling writes for the session.
  let initialReadError = false;
  let applying = false;
  let pending: StorageValue<T> | null = null;
  let base: string | null = null;
  // Web Locks: a save is queued for the lock; later edits just replace `pending`.
  let queued = false;
  // No Web Locks: this tab's last write and the disk value it was merged onto.
  let lastWrite: { raw: string; base: string | null; at: number } | null = null;
  const now = env.now ?? (() => Date.now());

  /**
   * A saved value, plus whether it carries the identity marker and whether its ids had to
   * be changed (`withStableIds`) to load. Null for unreadable or unsupported values.
   */
  const read = (
    raw: string | null,
  ): { value: StorageValue<T>; marked: boolean; migrated: boolean } | null => {
    if (raw == null) return null;
    try {
      const value = JSON.parse(raw) as StorageValue<T> & { identity?: unknown };
      if (!storedEnvelopeSupported(value) || (env.validate && !env.validate(value))) return null;
      // Versionless legacy desks use the current schema, including during cross-tab merges.
      const state = env.normalize ? env.normalize(value.state) : value.state;
      return {
        value: { state, version: DESK_STORAGE_VERSION },
        marked: value.identity === DESK_IDENTITY,
        migrated: state !== value.state,
      };
    } catch {
      return null;
    }
  };
  const parse = (raw: string | null): StorageValue<T> | null => read(raw)?.value ?? null;
  /** What this build writes: the value plus the identity marker. */
  const serialize = (value: StorageValue<T>): string =>
    JSON.stringify({ state: value.state, version: value.version, identity: DESK_IDENTITY });

  let conflict: DeskConflict | null = null;
  // `identity`: the repaired desk that `repairIdentity()` writes when nothing newer is pending.
  let conflictValue: StorageValue<T> | null = null;
  // `identity`: the exact disk value that caused the pause. `repairIdentity()` writes only
  // while the disk still holds it (checked under the save lock); anything newer is
  // classified again instead of being overwritten or re-reported as a fresh conflict.
  let conflictRaw: string | null = null;
  // Each original is archived once, even if the same value is seen again later.
  const archived = new Set<string>();
  /**
   * Pause saving. `keep` (when given) is stored as a recovery copy first, so the desk that
   * could otherwise be lost stays available under "Local recovery copies".
   */
  const enterConflict = (kind: DeskConflict, keep: string | null) => {
    if (conflict) return;
    conflict = kind;
    if (keep !== null && !archived.has(keep)) {
      try {
        keepRecoveryCopy(env.storage, keep, kind, now());
        archived.add(keep);
        env.recoveryChanged?.();
      } catch {
        /* quota: saving stays paused, so the desk in this tab is still not overwritten */
      }
    }
    env.conflict?.(kind);
  };
  /** Pause for ids that cannot be trusted in `raw`; `value` is the repaired desk. */
  const enterIdentityConflict = (raw: string, value: StorageValue<T>) => {
    if (conflict) return;
    conflictValue = value;
    conflictRaw = raw;
    enterConflict("identity", raw);
  };
  /**
   * Classify a newer disk value written by someone else. Returns the value to merge or
   * apply, or null after entering a hold or a conflict.
   */
  const fromOtherTab = (raw: string, firstRead = false): StorageValue<T> | null => {
    const result = read(raw);
    if (!result) {
      hold();
      return null;
    }
    // After a failed first read this is the desk this tab never managed to load, not a
    // newer write: an unmarked (older) save is simply migrated, as on a normal load.
    if (!result.marked && !firstRead) {
      // An older version saved. Keep what this tab has, and stop writing.
      const mine = pending ? serialize(pending) : base;
      enterConflict("old-tab", mine !== null && mine !== raw ? mine : null);
      return null;
    }
    if (result.migrated) {
      enterIdentityConflict(raw, result.value);
      return null;
    }
    return result.value;
  };
  const hold = () => {
    readFailed = true;
    env.status("failed");
  };
  /** Merge this tab's unsaved snapshot onto a newer disk value it has not seen yet. */
  const mergeOnto = (disk: StorageValue<T>, mine: StorageValue<T>): StorageValue<T> => ({
    ...mine,
    state: merge3(parse(base)?.state, mine.state, disk.state) as T,
    version: mine.version,
  });
  const applyLocal = (value: StorageValue<T>, apply?: (value: StorageValue<T>) => void) => {
    applying = true;
    try {
      if (apply) apply(value);
      else env.merged?.(value as StorageValue<unknown>);
    } finally {
      applying = false;
    }
  };

  /** Read–merge–write. Runs under the shared save lock whenever the browser has one. */
  const flushNow = () => {
    // Before the first read (hydration) a snapshot holds defaults, not the saved desk.
    if (!pending || !initialized || readFailed || conflict) return;
    try {
      let next = pending;
      let raw = serialize(next);
      const current = env.storage.getItem(name);
      const changed = current !== base && current !== raw;
      // A newer unreadable/unsupported save must survive, even before its event arrives;
      // so must a save from an older version (see `fromOtherTab`).
      const disk =
        changed && current !== null
          ? fromOtherTab(current, initialReadError && base === null)
          : null;
      let merged = false;
      if (changed && current !== null && !disk) return;
      if (disk && disk.version === next.version) {
        // Another tab saved after our last sync and its event has not arrived yet.
        // After a failed first read there is no trustworthy base for this tab, so the
        // saved desk owns the scalar fields; the pending items are still merged in.
        next =
          initialReadError && base === null
            ? { ...next, state: merge3(undefined, disk.state, next.state) as T }
            : mergeOnto(disk, next);
        raw = serialize(next);
        merged = raw !== serialize(pending);
      }
      // Unchanged content: skip the write (and the storage event it would send).
      if (current !== raw) {
        env.storage.setItem(name, raw);
        if (!env.locks) lastWrite = { raw, base: current, at: now() };
      }
      base = raw;
      pending = null;
      initialReadError = false;
      env.status("ready");
      if (merged) applyLocal(next);
    } catch {
      env.status("failed");
    }
  };

  /**
   * Save `pending`. With Web Locks the read–merge–write waits for the shared lock (edits
   * made meanwhile are folded into the same save); if the lock cannot be requested, the
   * save runs directly as before rather than being dropped.
   */
  const flush = () => {
    if (!env.locks) {
      flushNow();
      return;
    }
    if (queued) return;
    queued = true;
    const run = () => {
      queued = false;
      flushNow();
    };
    try {
      env.locks.request(DESK_SAVE_LOCK, run).catch(() => {
        if (queued) run();
      });
    } catch {
      run();
    }
  };

  /**
   * No-locks fallback: another tab's save arrived right after this tab's own write. If it
   * would lose that write (it was merged onto the same older value), keep this tab's write
   * as a recovery copy before the newer save replaces it in memory.
   */
  const keepConflictCopy = (incoming: StorageValue<T>) => {
    const mine = lastWrite;
    lastWrite = null;
    if (!mine || env.locks || now() - mine.at > CONFLICT_WINDOW_MS) return;
    const written = parse(mine.raw);
    if (!written) return;
    const combined = merge3(parse(mine.base)?.state, written.state, incoming.state);
    if (JSON.stringify(combined) === JSON.stringify(incoming.state)) return;
    try {
      keepRecoveryCopy(env.storage, mine.raw, "conflict", now());
      env.recoveryChanged?.();
    } catch {
      /* quota: the newer save still loads; nothing else can be done here */
    }
  };

  const storage: PersistStorage<T> = {
    getItem() {
      if (pending && initialized) return pending;
      // First read is hydration: load what is on disk. A pre-hydration snapshot
      // (e.g. a language click while the pack loads) would hide the saved desk;
      // merge keeps that choice and the next set saves it on top of the real data.
      pending = null;
      let raw: string | null;
      try {
        raw = env.storage.getItem(name);
      } catch {
        // The browser refused the read (blocked storage, transient policy error). That is
        // not evidence of a corrupt save: keep writes available and retry on the next save.
        initialized = true;
        initialReadError = true;
        env.status("failed");
        return null;
      }
      initialized = true;
      const result = read(raw);
      if (raw !== null && !result) {
        // Readable but unusable/unsupported: hold the original bytes.
        hold();
        return null;
      }
      base = raw;
      if (raw !== null && result && result.marked && result.migrated) {
        // Ids were already migrated once, yet need changing again: do not guess. Show the
        // repaired desk, keep the original, and wait for an explicit repair.
        enterIdentityConflict(raw, result.value);
      }
      // An unmarked (older) save with repeated or blank ids is the one deterministic
      // migration: it loads with fixed ids, and the next save writes them with the marker.
      return result?.value ?? null;
    },
    setItem(_name, value) {
      // State applied from another tab is already on disk; writing it back could ping-pong.
      if (applying) return;
      pending = value;
      flush();
    },
    removeItem() {
      // Do not silently delete user data through persist.clearStorage().
      env.status("failed");
    },
  };

  return {
    storage,
    flush,
    /**
     * The page is going away: a save still waiting for the lock may never get it, so
     * write it now (the read–merge–write still merges onto the latest disk value).
     */
    flushBeforeUnload() {
      if (queued) flushNow();
    },
    /**
     * Another tab wrote the desk. The event's own value may already be stale
     * (events queue behind this tab's own saves), so read the disk now and apply
     * that. Nothing to do when the disk is what this tab last saved or applied.
     * Ignored before hydration, during a corrupt-save hold, while already
     * applying, and for removed values. Unreadable/unsupported saves enter a recovery hold.
     */
    syncFrom(raw: string | null, apply: (value: StorageValue<T>) => void): boolean {
      if (!initialized || readFailed || applying || raw == null || conflict) return false;
      let latest: string | null;
      try {
        latest = env.storage.getItem(name);
      } catch {
        // The event may be stale. Without a fresh disk read, never roll memory backwards.
        env.status("failed");
        return false;
      }
      if (latest == null || latest === base) return false;
      let value = fromOtherTab(latest);
      if (!value) return false;
      keepConflictCopy(value);
      if (pending && pending.version === value.version) {
        // A failed save is still waiting: keep it on top of the newer desk. If the first
        // read had failed, the disk is the only trustworthy side for scalar fields.
        value =
          initialReadError && base === null
            ? { ...pending, state: merge3(undefined, value.state, pending.state) as T }
            : mergeOnto(value, pending);
        pending = value;
        base = latest;
        initialReadError = false;
        applyLocal(value, apply);
        flush();
        return true;
      }
      pending = null;
      base = latest;
      initialReadError = false;
      applyLocal(value, apply);
      env.status("ready");
      return true;
    },
    /** Explicit, confirmed import only. Preserve a corrupt original before replacing it. */
    async replace(value: StorageValue<T>): Promise<boolean> {
      return (await this.replaceIf(value)) === "ok";
    },
    /**
     * `replace`, but only if `check` still accepts the desk at the moment of writing: it
     * runs under the save lock and sees the saved value plus this tab's unsaved edits.
     * "changed" means nothing was written because the desk moved on (another tab or a
     * late edit); the caller asks the visitor again instead of overwriting that work.
     */
    async replaceIf(
      value: StorageValue<T>,
      check?: (saved: StorageValue<T> | null, unsaved: StorageValue<T> | null) => boolean,
    ): Promise<"ok" | "changed" | "failed"> {
      const run = () => {
        if (check) {
          let saved: StorageValue<T> | null;
          try {
            saved = parse(env.storage.getItem(name));
          } catch {
            saved = null;
          }
          if (!check(saved, pending)) return "changed" as const;
        }
        return replaceNow(value) ? ("ok" as const) : ("failed" as const);
      };
      if (!env.locks) return run();
      try {
        const result = await env.locks.request(DESK_SAVE_LOCK, run);
        return result === "ok" || result === "changed" ? result : "failed";
      } catch {
        return run();
      }
    },
    /** The current pause, if any (see `DeskConflict`). */
    conflict: () => conflict,
    /**
     * Explicit "repair and continue" for an `identity` conflict: write the desk with the
     * repaired ids (or this tab's newer edits) and resume saving. The original was kept as
     * a recovery copy when the conflict began.
     */
    async repairIdentity(apply?: (value: StorageValue<T>) => void): Promise<boolean> {
      if (conflict !== "identity") return false;
      const run = () => repairNow(apply);
      if (!env.locks) return run();
      try {
        return (await env.locks.request(DESK_SAVE_LOCK, run)) === true;
      } catch {
        return run();
      }
    },
    dispose() {},
  };

  /**
   * "Repair and continue", under the save lock. Success means the repaired desk is on disk
   * and saving runs again; anything else leaves the pause (and its notice) in place.
   * - The disk still holds the value that caused the pause (or what this tab last saw):
   *   write the repaired desk, with this tab's edits made during the pause merged in.
   * - Another tab saved meanwhile: classify that value afresh. A clean save from this build
   *   is merged with this tab's edits; another untrusted or older save is a new pause
   *   (its original kept once); an unreadable one is held.
   */
  function repairNow(apply?: (value: StorageValue<T>) => void): boolean {
    if (conflict !== "identity") return false;
    let current: string | null;
    try {
      current = env.storage.getItem(name);
    } catch {
      env.status("failed");
      return false;
    }
    let target: StorageValue<T> | null = conflictValue;
    if (current !== conflictRaw && current !== base && current !== null) {
      const result = read(current);
      if (!result) {
        hold();
        return false;
      }
      if (!result.marked || result.migrated) {
        // Still (or again) not safe to write over. Swap the pause for the new value.
        const mine = pending ? serialize(pending) : base;
        conflict = null;
        conflictValue = null;
        conflictRaw = null;
        if (!result.marked)
          enterConflict("old-tab", mine !== null && mine !== current ? mine : null);
        else enterIdentityConflict(current, result.value);
        return false;
      }
      // Another tab already wrote a trustworthy desk: keep it, with this tab's edits.
      target = result.value;
    }
    let next = target;
    if (pending && next && pending.version === next.version) {
      next = { ...pending, state: merge3(parse(base)?.state, pending.state, next.state) as T };
    } else if (pending) {
      next = pending;
    }
    if (!next) {
      // Nothing to write (the paused value was empty): just resume.
      clearConflict();
      return true;
    }
    const raw = serialize(next);
    try {
      if (current !== raw) env.storage.setItem(name, raw);
    } catch {
      env.status("failed");
      return false;
    }
    base = raw;
    pending = null;
    lastWrite = null;
    clearConflict();
    applyLocal(next, apply);
    env.status("ready");
    return true;
  }

  function clearConflict() {
    conflict = null;
    conflictValue = null;
    conflictRaw = null;
    env.conflict?.(null);
  }

  function replaceNow(value: StorageValue<T>): boolean {
    let archived = false;
    try {
      const previous = env.storage.getItem(name);
      if (previous !== null && (readFailed || !parse(previous))) {
        // If archiving fails (e.g. quota), leave the original untouched.
        keepRecoveryCopy(env.storage, previous, "unreadable", now());
        archived = true;
      }
      const raw = serialize(value);
      env.storage.setItem(name, raw);
      base = raw;
      // An explicit import or restore is the visitor's decision: saving resumes.
      if (conflict) clearConflict();
      initialized = true;
      readFailed = false;
      initialReadError = false;
      pending = null;
      lastWrite = null;
      env.status("ready");
      if (archived) env.recoveryChanged?.();
      return true;
    } catch {
      if (archived) env.recoveryChanged?.();
      env.status("failed");
      return false;
    }
  }
}
