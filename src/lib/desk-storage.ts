import type { PersistStorage, StorageValue } from "zustand/middleware";
import { merge3 } from "./merge3.ts";

export type SaveStatus = "ready" | "failed";
export type DeskStorageEnvironment = {
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  status: (status: SaveStatus) => void;
  /**
   * Called when a save had to be merged with a newer save from another tab, so
   * the in-memory desk can take the merged result. Optional for older callers.
   */
  merged?: (value: StorageValue<unknown>) => void;
};

function recoveryId(): string {
  const id = globalThis.crypto?.randomUUID?.();
  return id ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Every tab saves. Tabs stay in step through `syncFrom`, fed by the browser's
 * `storage` event. `base` is the last disk value this tab is known to match; if
 * the disk moved on before this tab's save (its event is still queued), the save
 * is merged three ways instead of blindly overwriting. This is not a cross-tab
 * transaction; simultaneous read/write operations can still conflict.
 * Storage events are only a hint: `syncFrom` always reads the current disk value,
 * so a late, stale event can never roll a tab back. The saved format is still
 * `{ state, version: 0 }`. A corrupt saved desk is never overwritten until an
 * explicit, successful restore.
 */
export function createDeskStorage<T>(env: DeskStorageEnvironment) {
  const name = "13th-desk-v1";
  let initialized = false;
  let readFailed = false;
  let applying = false;
  let pending: StorageValue<T> | null = null;
  let base: string | null = null;

  const parse = (raw: string | null): StorageValue<T> | null => {
    if (raw == null) return null;
    try {
      const value = JSON.parse(raw) as StorageValue<T>;
      return value && typeof value === "object" ? value : null;
    } catch {
      return null;
    }
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

  const flush = () => {
    // Before the first read (hydration) a snapshot holds defaults, not the saved desk.
    if (!pending || !initialized || readFailed) return;
    try {
      let next = pending;
      let raw = JSON.stringify(next);
      const current = env.storage.getItem(name);
      const disk = current !== base && current !== raw ? parse(current) : null;
      let merged = false;
      if (disk && disk.version === next.version) {
        // Another tab saved after our last sync and its event has not arrived yet.
        next = mergeOnto(disk, next);
        raw = JSON.stringify(next);
        merged = raw !== JSON.stringify(pending);
      }
      // Unchanged content: skip the write (and the storage event it would send).
      if (current !== raw) env.storage.setItem(name, raw);
      base = raw;
      pending = null;
      env.status("ready");
      if (merged) applyLocal(next);
    } catch {
      env.status("failed");
    }
  };

  const storage: PersistStorage<T> = {
    getItem() {
      if (pending && initialized) return pending;
      // First read is hydration: load what is on disk. A pre-hydration snapshot
      // (e.g. a language click while the pack loads) would hide the saved desk;
      // merge keeps that choice and the next set saves it on top of the real data.
      pending = null;
      try {
        const raw = env.storage.getItem(name);
        initialized = true;
        const value = raw ? JSON.parse(raw) as StorageValue<T> : null;
        base = raw;
        return value;
      } catch {
        initialized = true;
        readFailed = true;
        env.status("failed");
        return null;
      }
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
     * Another tab wrote the desk. The event's own value may already be stale
     * (events queue behind this tab's own saves), so read the disk now and apply
     * that. Nothing to do when the disk is what this tab last saved or applied.
     * Ignored before hydration, during a corrupt-save hold, while already
     * applying, and for removed or unreadable values.
     */
    syncFrom(raw: string | null, apply: (value: StorageValue<T>) => void): boolean {
      if (!initialized || readFailed || applying || raw == null) return false;
      let latest: string | null;
      try {
        latest = env.storage.getItem(name);
      } catch {
        latest = raw;
      }
      if (latest == null || latest === base) return false;
      let value = parse(latest);
      if (!value) return false;
      if (pending && pending.version === value.version) {
        // A failed save is still waiting: keep it on top of the newer desk.
        value = mergeOnto(value, pending);
        pending = value;
        base = latest;
        applyLocal(value, apply);
        flush();
        return true;
      }
      pending = null;
      base = latest;
      applyLocal(value, apply);
      return true;
    },
    /** Explicit, confirmed import only. Preserve a corrupt original before replacing it. */
    async replace(value: StorageValue<T>): Promise<boolean> {
      try {
        const previous = env.storage.getItem(name);
        if (readFailed && previous !== null) {
          // If archiving fails (e.g. quota), leave the original untouched.
          env.storage.setItem(`${name}:recovery:${recoveryId()}`, previous);
        }
        const raw = JSON.stringify(value);
        env.storage.setItem(name, raw);
        base = raw;
        initialized = true;
        readFailed = false;
        pending = null;
        env.status("ready");
        return true;
      } catch {
        env.status("failed");
        return false;
      }
    },
    dispose() {},
  };
}
