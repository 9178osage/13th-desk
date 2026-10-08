import { useEffect, useId, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Download, Upload, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui";
import {
  backupFileName,
  beforeImportFileName,
  clearPreImportSnapshot,
  downloadDeskBackupFile,
  DESK_PRE_IMPORT_EVENT,
  importUndoOffered,
  parseDeskBackup,
  readPreImportSnapshot,
  writePreImportSnapshot,
  type BackupParseError,
  type BackupSummary,
  type PersistedDeskLike,
} from "@/lib/desk-backup";
import { deskText as c, type DeskCopyKey } from "@/lib/desk-copy";
import { LEVELS } from "@/lib/levels";
import { getPersistedDeskState, replacePersistedDeskState, useDesk, useLang } from "@/lib/store";
import { tr } from "@/lib/text";

const ERROR_COPY: Record<BackupParseError, DeskCopyKey> = {
  json: "importBadJson",
  shape: "importBadShape",
  version: "importBadVersion",
  stages: "importBadStages",
  times: "importBadTimes",
  grades: "importBadGrades",
};

type PendingImport = {
  state: PersistedDeskLike;
  summary: BackupSummary;
};

export function DeskBackup({ compact = false }: { compact?: boolean }) {
  const lang = useLang();
  const hydrated = useDesk((s) => s.hydrated);
  const fileRef = useRef<HTMLInputElement>(null);
  const importButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const hintId = useId();
  const [message, setMessage] = useState<DeskCopyKey | null>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [snapshot, setSnapshot] = useState<PersistedDeskLike | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    const sync = () => setSnapshot(readPreImportSnapshot());
    sync();
    window.addEventListener(DESK_PRE_IMPORT_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(DESK_PRE_IMPORT_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Import confirmation is a modal: focus moves in, Tab stays inside, Escape
  // cancels, and focus returns to the Import button when it closes.
  const dialogOpen = pending !== null;
  useEffect(() => {
    if (!dialogOpen) return;
    const panel = panelRef.current;
    const opener = importButtonRef.current;
    confirmRef.current?.focus();
    return () => {
      const active = document.activeElement;
      if (!active || active === document.body || panel?.contains(active)) opener?.focus();
    };
  }, [dialogOpen]);

  function onDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setPending(null);
      return;
    }
    if (event.key !== "Tab" || !panelRef.current) return;
    const focusable = [...panelRef.current.querySelectorAll<HTMLElement>("button:not(:disabled)")];
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function downloadBackup() {
    downloadDeskBackupFile(getPersistedDeskState(), backupFileName());
    setMessage("exportDone");
    setPending(null);
  }

  function onPickFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const result = parseDeskBackup(text);
      if (!result.ok) {
        setPending(null);
        setMessage(ERROR_COPY[result.error]);
        return;
      }
      setPending({ state: result.backup.state, summary: result.summary });
      setMessage(null);
    };
    reader.onerror = () => {
      setPending(null);
      setMessage("importBadJson");
    };
    reader.readAsText(file);
  }

  async function confirmImport() {
    if (!pending || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    const before = getPersistedDeskState();
    // Always download a before-import backup first.
    downloadDeskBackupFile(before, beforeImportFileName());
    const saved = await replacePersistedDeskState(pending.state);
    busyRef.current = false;
    setBusy(false);
    if (!saved) {
      setPending(null);
      setMessage("importSaveFailed");
      return;
    }
    const stored = writePreImportSnapshot(before);
    setSnapshot(before);
    setPending(null);
    setMessage(stored ? "importDone" : "beforeImportStorageFail");
  }

  async function undoImport() {
    if (busyRef.current) return;
    const current = snapshot ?? readPreImportSnapshot();
    if (!current) return;
    busyRef.current = true;
    setBusy(true);
    const saved = await replacePersistedDeskState(current);
    busyRef.current = false;
    setBusy(false);
    if (!saved) { setMessage("importSaveFailed"); return; }
    clearPreImportSnapshot();
    setSnapshot(null);
    setMessage("importUndone");
  }

  function dismissUndo() {
    clearPreImportSnapshot();
    setSnapshot(null);
  }

  const showUndo = importUndoOffered(snapshot !== null);

  return (
    <div className={compact ? "desk-backup desk-backup-compact" : "desk-backup"}>
      {!compact && <p className="backup-title">{c(lang, "backup")}</p>}
      <div className="backup-actions">
        <button type="button" className="backup-link" disabled={!hydrated} onClick={downloadBackup}>
          <Download size={14} aria-hidden="true" />
          {c(lang, "exportData")}
        </button>
        <button
          ref={importButtonRef}
          type="button"
          className="backup-link"
          disabled={!hydrated}
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={14} aria-hidden="true" />
          {c(lang, "importData")}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-label={c(lang, "importData")}
          onChange={onPickFile}
        />
      </div>
      {pending && (
        <div className="backup-overlay" role="presentation">
          <div
            ref={panelRef}
            className="backup-panel"
            role="dialog"
            aria-modal="true"
            aria-label={c(lang, "importData")}
            aria-describedby={hintId}
            onKeyDown={onDialogKeyDown}
          >
            <p id={hintId}>{c(lang, "importHint")}</p>
            <p>
              {c(lang, "importPreview", {
                notes: pending.summary.totalNotes,
                classes: pending.summary.totalClasses,
                grades: pending.summary.totalGrades,
              })}
            </p>
            <ul className="backup-stage-list">
              {LEVELS.map((item) => {
                const counts = pending.summary.stages[item.id];
                return (
                  <li key={item.id}>
                    {c(lang, "importStageLine", {
                      level: tr(lang, item),
                      notes: counts.notes,
                      classes: counts.schedule,
                    })}
                  </li>
                );
              })}
            </ul>
            <div className="form-actions">
              <Button ref={confirmRef} type="button" disabled={busy} onClick={confirmImport}>
                {c(lang, "importConfirm")}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setPending(null)}>
                {c(lang, "cancel")}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Always mounted so screen readers announce export/import/undo results. */}
      <div className="inline-feedback backup-feedback" role="status">
        {message && <span>{c(lang, message)}</span>}
        {showUndo && (
          <span className="backup-undo-bar">
            <button type="button" disabled={busy} onClick={undoImport}>
              <RotateCcw size={14} aria-hidden="true" />
              {c(lang, "importUndo")}
            </button>
            <button
              type="button"
              className="backup-undo-dismiss"
              aria-label={c(lang, "dismissUndo")}
              onClick={dismissUndo}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
