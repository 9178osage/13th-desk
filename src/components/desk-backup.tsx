import { useEffect, useId, useRef, useState, useSyncExternalStore, type ChangeEvent } from "react";
import { Download, Upload, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui";
import {
  backupFileName,
  backupFileTooLarge,
  beforeImportFileName,
  beforeUndoFileName,
  clearPreImportSnapshot,
  deskFingerprint,
  downloadDeskBackupFile,
  importUndoOffered,
  parseDeskBackup,
  writePreImportSnapshot,
  type BackupParseError,
  type BackupSummary,
  type PersistedDeskLike,
  type PreImportRecord,
} from "@/lib/desk-backup";
import { deskText as c, type DeskCopyKey } from "@/lib/desk-copy";
import { LEVELS } from "@/lib/levels";
import { createLatestFileRead } from "@/lib/latest-file-read";
import { useModalFocus } from "@/lib/modal-focus";
import { preImportRecord, setPreImportRecord, subscribePreImport } from "@/lib/pre-import-state";
import { saveRecoveryCopy } from "@/lib/recovery-copies";
import { RecoveryCopies } from "@/components/recovery-copies";
import {
  getPersistedDeskState,
  replacePersistedDeskState,
  undoImportTo,
  useDesk,
  useLang,
} from "@/lib/store";
import { tr } from "@/lib/text";

const ERROR_COPY: Record<BackupParseError, DeskCopyKey> = {
  json: "importBadJson",
  shape: "importBadShape",
  version: "importBadVersion",
  stages: "importBadStages",
  times: "importBadTimes",
  grades: "importBadGrades",
  overflow: "importTooMany",
};

type PendingImport = {
  state: PersistedDeskLike;
  summary: BackupSummary;
  /** Shown in the confirmation, so the visitor sees which backup will replace the desk. */
  fileName: string;
};

/** "Undo import" when the desk changed after the import: what will be replaced. */
type UndoAsk = { record: PreImportRecord; current: PersistedDeskLike; fingerprint: string };

export function DeskBackup({ compact = false }: { compact?: boolean }) {
  const lang = useLang();
  const hydrated = useDesk((s) => s.hydrated);
  const fileRef = useRef<HTMLInputElement>(null);
  const importButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const undoPanelRef = useRef<HTMLDivElement>(null);
  const undoCancelRef = useRef<HTMLButtonElement>(null);
  const undoButtonRef = useRef<HTMLButtonElement>(null);
  const hintId = useId();
  const undoTitleId = useId();
  const [message, setMessage] = useState<DeskCopyKey | null>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [undoAsk, setUndoAsk] = useState<UndoAsk | null>(null);
  // One shared snapshot state for the sidebar and footer copies (see pre-import-state.ts).
  const snapshot = useSyncExternalStore(subscribePreImport, preImportRecord, () => null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  // Only the latest picked file may fill the confirmation (see latest-file-read.ts).
  const [reading, setReading] = useState(false);
  const fileRead = useRef<ReturnType<typeof createLatestFileRead> | null>(null);
  useEffect(() => () => fileRead.current?.cancel(), []);

  // Both confirmations are modals: focus moves in, Tab stays inside, Escape cancels, and
  // focus returns to the control that opened them.
  useModalFocus(pending !== null, panelRef, {
    initial: confirmRef,
    returnTo: importButtonRef,
    onEscape: () => setPending(null),
  });
  useModalFocus(undoAsk !== null, undoPanelRef, {
    initial: undoCancelRef,
    returnTo: undoButtonRef,
    onEscape: () => setUndoAsk(null),
  });

  function downloadBackup() {
    downloadDeskBackupFile(getPersistedDeskState(), backupFileName());
    setMessage("exportDone");
    setPending(null);
  }

  function onPickFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    // A new pick replaces any earlier one, even one still being read.
    fileRead.current?.cancel();
    setPending(null);
    if (backupFileTooLarge(file.size)) {
      setReading(false);
      setMessage("importTooLarge");
      return;
    }
    fileRead.current ??= createLatestFileRead(() => new FileReader());
    const read = fileRead.current;
    const fileName = file.name;
    setReading(true);
    setMessage("importReading");
    read.read(file, (outcome) => {
      setReading(false);
      if (!outcome.ok) {
        setMessage("importBadJson");
        return;
      }
      const result = parseDeskBackup(outcome.text);
      if (!result.ok) {
        setMessage(ERROR_COPY[result.error]);
        return;
      }
      setPending({ state: result.backup.state, summary: result.summary, fileName });
      setMessage(null);
    });
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
    // Remember what the import wrote, so undo can tell whether the desk changed since.
    const imported = getPersistedDeskState();
    const stored = writePreImportSnapshot(before, imported);
    setPreImportRecord({ state: before, importedFingerprint: deskFingerprint(imported) });
    setPending(null);
    setMessage(stored ? "importDone" : "beforeImportStorageFail");
  }

  /**
   * Undo puts the whole desk back as it was before the import. If nothing changed since
   * the import it runs at once. Otherwise (or for a snapshot from an older version, which
   * cannot tell) the visitor is asked first, and the current desk is kept twice before it
   * is replaced: downloaded as a file and saved as a local recovery copy.
   */
  async function undoImport() {
    if (busyRef.current || !snapshot) return;
    const current = getPersistedDeskState();
    const fingerprint = deskFingerprint(current);
    if (snapshot.importedFingerprint !== null && snapshot.importedFingerprint === fingerprint) {
      await runUndo(snapshot, fingerprint, null);
      return;
    }
    setUndoAsk({ record: snapshot, current, fingerprint });
  }

  async function runUndo(
    record: PreImportRecord,
    fingerprint: string,
    keep: PersistedDeskLike | null,
  ) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    let kept = true;
    if (keep) {
      downloadDeskBackupFile(keep, beforeUndoFileName());
      kept = saveRecoveryCopy(localStorage, keep, "undo");
    }
    const result = await undoImportTo(record.state, fingerprint);
    busyRef.current = false;
    setBusy(false);
    setUndoAsk(null);
    if (result === "changed") {
      // The desk changed again (another tab, or an edit still saving): ask again next time.
      setMessage("importUndoChanged");
      return;
    }
    if (result === "failed") {
      setMessage("importSaveFailed");
      return;
    }
    clearPreImportSnapshot();
    setPreImportRecord(null);
    setMessage(keep ? (kept ? "importUndoneKept" : "importUndoneDownloaded") : "importUndone");
  }

  function dismissUndo() {
    clearPreImportSnapshot();
    setPreImportRecord(null);
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
          disabled={!hydrated || reading}
          aria-busy={reading}
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
        <RecoveryCopies lang={lang} hydrated={hydrated} onMessage={setMessage} />
      </div>
      <p className="backup-note">{c(lang, "exportPlainNote")}</p>
      {pending && (
        <div className="backup-overlay" role="presentation">
          <div
            ref={panelRef}
            className="backup-panel"
            role="dialog"
            aria-modal="true"
            aria-label={c(lang, "importData")}
            aria-describedby={hintId}
          >
            <p id={hintId}>{c(lang, "importHint")}</p>
            <p className="backup-file-name">
              {c(lang, "importFileName", { name: pending.fileName })}
            </p>
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
      {undoAsk && (
        <div className="backup-overlay" role="presentation">
          <div
            ref={undoPanelRef}
            className="backup-panel"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={undoTitleId}
          >
            <p id={undoTitleId}>
              <strong>{c(lang, "importUndoChangedTitle")}</strong>
            </p>
            <p>{c(lang, "importUndoChangedHint")}</p>
            <p>{c(lang, "importUndoNow", deskCounts(undoAsk.current))}</p>
            <p>{c(lang, "importUndoBack", deskCounts(undoAsk.record.state))}</p>
            <div className="form-actions">
              <Button
                type="button"
                disabled={busy}
                onClick={() => void runUndo(undoAsk.record, undoAsk.fingerprint, undoAsk.current)}
              >
                {c(lang, "importUndoKeepAndUndo")}
              </Button>
              <Button
                ref={undoCancelRef}
                type="button"
                variant="ghost"
                onClick={() => setUndoAsk(null)}
              >
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
            <button
              ref={undoButtonRef}
              type="button"
              disabled={busy}
              onClick={() => void undoImport()}
            >
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

/** Whole-desk counts for the undo confirmation (every stage, like the import preview). */
function deskCounts(state: PersistedDeskLike) {
  let notes = 0;
  let classes = 0;
  let grades = 0;
  for (const item of LEVELS) {
    const bucket = state.buckets[item.id];
    notes += bucket.notes.length;
    classes += bucket.schedule.length;
    grades += bucket.grades.length;
  }
  return { notes, classes, grades };
}
