import { useEffect, useRef } from "react";
import { DESK_PRE_IMPORT_EVENT, DESK_PRE_IMPORT_KEY } from "./desk-backup.ts";

/**
 * True for a storage event that means the desk was replaced wholesale in another tab:
 * an import writes the pre-import snapshot and undoing it removes the snapshot. An
 * ordinary save there only touches the desk key and must not close editors here.
 */
export function isDeskReplacedStorageEvent(key: string | null): boolean {
  return key === DESK_PRE_IMPORT_KEY || key === null;
}

/**
 * Run when the saved desk is replaced wholesale: an import or undo-import in this tab
 * (the pre-import event fires after the write) or in another tab (its pre-import key
 * changes; `key === null` is a full localStorage clear). Local, session-only undo state
 * must not survive that boundary, or it can inject a row from the old desk into the
 * new one. Ordinary cross-tab saves do not trigger it; editors close on their own when
 * the row they edit is gone (see `rowAt`).
 *
 * The callback is kept in a ref so an inline arrow does not re-subscribe on every render.
 */
export function useDeskReplaced(onReplaced: () => void) {
  const callback = useRef(onReplaced);
  // Synced after commit (not during render); the events only fire after effects run.
  useEffect(() => {
    callback.current = onReplaced;
  });
  useEffect(() => {
    const run = () => callback.current();
    const onStorage = (event: StorageEvent) => {
      if (isDeskReplacedStorageEvent(event.key)) run();
    };
    window.addEventListener(DESK_PRE_IMPORT_EVENT, run);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(DESK_PRE_IMPORT_EVENT, run);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
}
