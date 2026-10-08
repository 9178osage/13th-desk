import type { PersistStorage, StorageValue } from "zustand/middleware";

export type SaveStatus = "ready" | "failed";
export type DeskStorageEnvironment = {
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  status: (status: SaveStatus) => void;
};

function recoveryId(): string {
  const id = globalThis.crypto?.randomUUID?.();
  return id ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Every tab saves (last write wins for truly simultaneous edits). Tabs stay in
 * step through `syncFrom`, fed by the browser's `storage` event. A corrupt
 * saved desk is never overwritten until an explicit, successful restore.
 */
export function createDeskStorage<T>(env: DeskStorageEnvironment) {
  const name = "13th-desk-v1";
  let initialized = false;
  let readFailed = false;
  let applying = false;
  let pending: StorageValue<T> | null = null;

  const flush = () => {
    // Before the first read (hydration) a snapshot holds defaults, not the saved desk.
    if (!pending || !initialized || readFailed) return;
    try {
      const raw = JSON.stringify(pending);
      // Unchanged content: skip the write (and the storage event it would send).
      if (env.storage.getItem(name) !== raw) env.storage.setItem(name, raw);
      pending = null;
      env.status("ready");
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
        return raw ? JSON.parse(raw) as StorageValue<T> : null;
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
     * Another tab wrote the desk. Apply its saved value here so this tab's next
     * save builds on it. Ignored before hydration, during a corrupt-save hold,
     * while already applying, and for removed or unreadable values.
     */
    syncFrom(raw: string | null, apply: (value: StorageValue<T>) => void): boolean {
      if (!initialized || readFailed || applying || raw == null) return false;
      let value: StorageValue<T>;
      try {
        value = JSON.parse(raw) as StorageValue<T>;
      } catch {
        return false;
      }
      if (!value || typeof value !== "object") return false;
      pending = null;
      applying = true;
      try {
        apply(value);
      } finally {
        applying = false;
      }
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
        env.storage.setItem(name, JSON.stringify(value));
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
