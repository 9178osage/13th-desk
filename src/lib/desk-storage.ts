import type { PersistStorage, StorageValue } from "zustand/middleware";

export type SaveStatus = "ready" | "failed" | "conflict" | "unsupported";
export type DeskStorageEnvironment = {
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  // A single writable tab prevents read/check/write races, including at pagehide.
  locks?: Pick<LockManager, "request">;
  status: (status: SaveStatus) => void;
};

/** One writer per origin; other tabs remain readable and can export their in-memory data. */
export function createDeskStorage<T>(env: DeskStorageEnvironment) {
  const name = "13th-desk-v1";
  let baseline: string | null = null;
  let initialized = false;
  let readFailed = false;
  let writable = false;
  let pending: StorageValue<T> | null = null;
  let release: (() => void) | undefined;
  let readyResolve: () => void = () => {};
  const ready = new Promise<void>((resolve) => { readyResolve = resolve; });

  const flush = () => {
    if (!pending || !writable || readFailed) return;
    try {
      if (!initialized || env.storage.getItem(name) !== baseline) {
        env.status("conflict");
        return;
      }
      const raw = JSON.stringify(pending);
      env.storage.setItem(name, raw);
      baseline = raw;
      pending = null;
      env.status("ready");
    } catch {
      env.status("failed");
    }
  };

  if (env.locks) {
    void env.locks.request(`${name}:writer`, { ifAvailable: true }, async (lock) => {
      writable = lock !== null;
      if (!writable) env.status("conflict");
      readyResolve();
      if (!writable) return;
      flush();
      // Browser releases this automatically on close/crash. Do not release at
      // visibilitychange: a background tab must not regain an unguarded writer.
      await new Promise<void>((resolve) => { release = resolve; });
    }).catch(() => { env.status("failed"); readyResolve(); });
  } else {
    // Never pretend a localStorage lease is atomic across tabs.
    env.status("unsupported");
    readyResolve();
  }

  const storage: PersistStorage<T> = {
    getItem() {
      if (pending && initialized) return pending;
      // First read is hydration: load what is on disk. A pre-hydration snapshot
      // (e.g. a language click while the pack loads) would hide the saved desk;
      // merge keeps that choice and the next set saves it on top of the real data.
      pending = null;
      try {
        baseline = env.storage.getItem(name);
        initialized = true;
        return baseline ? JSON.parse(baseline) as StorageValue<T> : null;
      } catch {
        readFailed = true;
        env.status("failed");
        return null;
      }
    },
    setItem(_name, value) {
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
    /** Explicit, confirmed import only. Preserve the original before replacing it. */
    async replace(value: StorageValue<T>): Promise<boolean> {
      await ready;
      if (!writable) { env.status(env.locks ? "conflict" : "unsupported"); return false; }
      try {
        const previous = env.storage.getItem(name);
        if (previous !== baseline) { env.status("conflict"); return false; }
        if (readFailed && previous !== null) {
          // If archiving fails (e.g. quota), leave the original untouched.
          env.storage.setItem(`${name}:recovery:${crypto.randomUUID()}`, previous);
        }
        const raw = JSON.stringify(value);
        env.storage.setItem(name, raw);
        baseline = raw;
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
    dispose() { writable = false; release?.(); },
  };
}
