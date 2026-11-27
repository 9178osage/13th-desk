import {
  DESK_PRE_IMPORT_EVENT,
  DESK_PRE_IMPORT_KEY,
  readPreImportRecord,
  type PreImportRecord,
} from "./desk-backup.ts";

/**
 * One shared "Undo import" state for every backup control on the page (sidebar and
 * footer both mount one). It is read from storage once, then updated only when the
 * pre-import snapshot itself changes:
 * - this tab wrote or cleared it (`DESK_PRE_IMPORT_EVENT`);
 * - another tab wrote it (`storage` event for `13th-desk-v1:pre-import`) or removed it
 *   (an undo, a dismissal, or a newer import whose snapshot did not fit), or cleared all
 *   storage (`key === null`).
 * Ordinary saves (`13th-desk-v1`) and any other key are ignored, so a snapshot kept only
 * in memory (the storage write failed for quota) survives edits made in other tabs.
 */
type Listener = () => void;

export type PreImportEnv = {
  read: () => PreImportRecord | null;
  addWindowListener: (type: string, fn: (event: Event) => void) => void;
};

export function createPreImportState(env: PreImportEnv) {
  let current: PreImportRecord | null = null;
  let loaded = false;
  let listening = false;
  const listeners = new Set<Listener>();
  const emit = () => {
    for (const fn of listeners) fn();
  };
  const reload = () => {
    current = env.read();
    loaded = true;
    emit();
  };
  const listen = () => {
    if (listening) return;
    listening = true;
    env.addWindowListener(DESK_PRE_IMPORT_EVENT, reload);
    env.addWindowListener("storage", (event) => {
      const key = (event as StorageEvent).key;
      if (key === null) {
        current = null;
        loaded = true;
        emit();
      } else if (key === DESK_PRE_IMPORT_KEY) {
        reload();
      }
    });
  };
  return {
    get(): PreImportRecord | null {
      if (!loaded) {
        current = env.read();
        loaded = true;
      }
      return current;
    },
    /** This tab's own result, e.g. the snapshot it could only keep in memory. */
    set(next: PreImportRecord | null) {
      current = next;
      loaded = true;
      emit();
    },
    subscribe(fn: Listener): () => void {
      listen();
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

const browserState =
  typeof window === "undefined"
    ? null
    : createPreImportState({
        read: readPreImportRecord,
        addWindowListener: (type, fn) => window.addEventListener(type, fn),
      });

export function preImportRecord(): PreImportRecord | null {
  return browserState?.get() ?? null;
}
export function setPreImportRecord(next: PreImportRecord | null) {
  browserState?.set(next);
}
export function subscribePreImport(fn: Listener): () => void {
  return browserState?.subscribe(fn) ?? (() => {});
}
