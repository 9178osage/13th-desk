import { useEffect, useRef } from "react";
import { DESK_PRE_IMPORT_EVENT } from "./desk-backup.ts";

/**
 * Run when the saved desk is replaced wholesale: another import/undo in this tab
 * (the pre-import event fires after the write) or a newer desk arriving from another
 * tab. Local, session-only undo state must not survive that boundary, or it can inject
 * a row from the old desk into the new one.
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
      if (event.key === "13th-desk-v1") run();
    };
    window.addEventListener(DESK_PRE_IMPORT_EVENT, run);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(DESK_PRE_IMPORT_EVENT, run);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
}
