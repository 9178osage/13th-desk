import { useEffect, useId, useRef, useState } from "react";
import { LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui";
import {
  beforeImportFileName,
  DESK_PRE_IMPORT_KEY,
  deskFingerprint,
  downloadDeskBackupFile,
  readPreImportRecord,
  writePreImportSnapshot,
} from "@/lib/desk-backup";
import { deskText as c, type DeskCopyKey } from "@/lib/desk-copy";
import { LEVELS } from "@/lib/levels";
import { LOCALE } from "@/lib/locale";
import { useModalFocus } from "@/lib/modal-focus";
import { setPreImportRecord } from "@/lib/pre-import-state";
import {
  deleteRecoveryCopy,
  downloadRecoveryCopy,
  isRecoveryKey,
  listRecoveryCopies,
  RECOVERY_EVENT,
  type RecoveryCopy,
} from "@/lib/recovery-copies";
import { getPersistedDeskState, replacePersistedDeskState } from "@/lib/store";
import { tr, type Lang } from "@/lib/text";

const SOURCE_COPY: Record<RecoveryCopy["source"], DeskCopyKey> = {
  conflict: "recoveryFromConflict",
  unreadable: "recoveryFromUnreadable",
  "old-tab": "recoveryFromOldTab",
  identity: "recoveryFromIdentity",
  undo: "recoveryFromUndo",
  unknown: "recoveryFromUnknown",
};

function readCopies(): RecoveryCopy[] {
  try {
    return listRecoveryCopies(localStorage);
  } catch {
    return [];
  }
}

function readPreviousSnapshot(): string | null {
  try {
    return localStorage.getItem(DESK_PRE_IMPORT_KEY);
  } catch {
    return null;
  }
}

function copyDate(lang: Lang, createdAt: string | null): string {
  if (!createdAt) return c(lang, "recoveryUnknownDate");
  return new Intl.DateTimeFormat(LOCALE[lang], { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(createdAt),
  );
}

/**
 * "Local recovery copies": everything kept under `13th-desk-v1:recovery:`. Each copy can be
 * previewed, downloaded as it was stored, restored (after a second confirmation, and only
 * when the save reader can load it) or deleted one at a time. There is no "delete all".
 * Hidden while there are no copies.
 */
export function RecoveryCopies({
  lang,
  hydrated,
  onMessage,
}: {
  lang: Lang;
  hydrated: boolean;
  onMessage: (key: DeskCopyKey) => void;
}) {
  const [copies, setCopies] = useState<RecoveryCopy[]>([]);
  const [open, setOpen] = useState(false);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [asking, setAsking] = useState<{ key: string; action: "restore" | "delete" } | null>(null);
  const [busy, setBusy] = useState(false);
  const openerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();

  useEffect(() => {
    const sync = () => setCopies(readCopies());
    sync();
    const onStorage = (event: StorageEvent) => {
      // `key === null` is a full clear in another tab.
      if (event.key === null || isRecoveryKey(event.key)) sync();
    };
    window.addEventListener(RECOVERY_EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(RECOVERY_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const shown = open && copies.length > 0;
  const askingRef = useRef(asking);
  useEffect(() => {
    askingRef.current = asking;
  });
  // Focus starts on the title; Tab and Shift+Tab (including the first Shift+Tab from the
  // title) stay in the dialog, Escape works wherever focus is, and focus returns to the
  // "Local recovery copies" button afterwards.
  useModalFocus(shown, panelRef, {
    initial: titleRef,
    returnTo: openerRef,
    onEscape: () => {
      if (askingRef.current) setAsking(null);
      else close();
    },
  });

  if (copies.length === 0) return null;

  function close() {
    setOpen(false);
    setAsking(null);
    setPreviewing(null);
  }

  async function restore(copy: RecoveryCopy) {
    if (!copy.state || busy) return;
    setBusy(true);
    // First keep the current desk: a downloaded file and the same undo snapshot an import
    // leaves. If the restore then fails, the earlier undo snapshot is put back.
    const before = getPersistedDeskState();
    const previousSnapshot = readPreviousSnapshot();
    downloadDeskBackupFile(before, beforeImportFileName());
    const kept = writePreImportSnapshot(before, copy.state);
    const saved = await replacePersistedDeskState(copy.state);
    setBusy(false);
    setAsking(null);
    if (!saved) {
      try {
        if (previousSnapshot === null) localStorage.removeItem(DESK_PRE_IMPORT_KEY);
        else localStorage.setItem(DESK_PRE_IMPORT_KEY, previousSnapshot);
      } catch {
        /* the downloaded file still holds the desk */
      }
      setPreImportRecord(readPreImportRecord());
      onMessage("importSaveFailed");
      return;
    }
    // Undo after a restore works like undo after an import (memory copy if storage was full).
    setPreImportRecord({ state: before, importedFingerprint: deskFingerprint(copy.state) });
    close();
    onMessage(kept ? "recoveryRestored" : "beforeImportStorageFail");
  }

  function remove(copy: RecoveryCopy) {
    setAsking(null);
    if (!deleteRecoveryCopy(localStorage, copy.key)) {
      onMessage("recoveryDeleteFailed");
      return;
    }
    setCopies(readCopies());
    onMessage("recoveryDeleted");
  }

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        className="backup-link"
        disabled={!hydrated}
        onClick={() => setOpen(true)}
      >
        <LifeBuoy size={14} aria-hidden="true" />
        {c(lang, "recoveryOpen", { n: copies.length })}
      </button>
      {shown && (
        <div className="backup-overlay" role="presentation">
          <div
            ref={panelRef}
            className="backup-panel recovery-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <h2 id={titleId} ref={titleRef} tabIndex={-1} className="recovery-title">
              {c(lang, "recoveryTitle")}
            </h2>
            <p>{c(lang, "recoveryIntro")}</p>
            <ul className="recovery-list">
              {copies.map((copy) => {
                const summary = copy.summary;
                const isAsking = asking?.key === copy.key ? asking.action : null;
                return (
                  <li key={copy.key} className="recovery-item">
                    <p className="recovery-date">{copyDate(lang, copy.createdAt)}</p>
                    <p>{c(lang, SOURCE_COPY[copy.source])}</p>
                    {summary ? (
                      <p className="recovery-counts">
                        {c(lang, "recoveryCounts", {
                          notes: summary.totalNotes,
                          classes: summary.totalClasses,
                          grades: summary.totalGrades,
                        })}
                      </p>
                    ) : (
                      <p className="recovery-unreadable">{c(lang, "recoveryUnreadable")}</p>
                    )}
                    {summary && previewing === copy.key && (
                      <ul className="backup-stage-list">
                        {LEVELS.map((item) => {
                          const counts = summary.stages[item.id];
                          return (
                            <li key={item.id}>
                              {c(lang, "recoveryStageLine", {
                                level: tr(lang, item),
                                notes: counts.notes,
                                classes: counts.schedule,
                                grades: counts.grades,
                              })}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {isAsking ? (
                      <div className="recovery-ask" role="group">
                        <p>
                          {c(
                            lang,
                            isAsking === "restore" ? "recoveryRestoreAsk" : "recoveryDeleteAsk",
                          )}
                        </p>
                        <div className="form-actions">
                          <Button
                            type="button"
                            disabled={busy}
                            onClick={() => (isAsking === "restore" ? restore(copy) : remove(copy))}
                          >
                            {c(
                              lang,
                              isAsking === "restore"
                                ? "recoveryRestoreConfirm"
                                : "recoveryDeleteConfirm",
                            )}
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => setAsking(null)}>
                            {c(lang, "cancel")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="recovery-actions">
                        {summary && (
                          <button
                            type="button"
                            className="backup-link"
                            aria-expanded={previewing === copy.key}
                            onClick={() => setPreviewing(previewing === copy.key ? null : copy.key)}
                          >
                            {c(
                              lang,
                              previewing === copy.key ? "recoveryHidePreview" : "recoveryPreview",
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          className="backup-link"
                          onClick={() => downloadRecoveryCopy(copy)}
                        >
                          {c(lang, "recoveryDownload")}
                        </button>
                        <button
                          type="button"
                          className="backup-link"
                          disabled={!summary || busy}
                          onClick={() => setAsking({ key: copy.key, action: "restore" })}
                        >
                          {c(lang, "recoveryRestore")}
                        </button>
                        <button
                          type="button"
                          className="backup-link"
                          disabled={busy}
                          onClick={() => setAsking({ key: copy.key, action: "delete" })}
                        >
                          {c(lang, "recoveryDelete")}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="form-actions">
              <Button type="button" variant="ghost" onClick={close}>
                {c(lang, "close")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
