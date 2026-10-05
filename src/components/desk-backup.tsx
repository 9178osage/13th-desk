import { useRef, useState, type ChangeEvent } from "react";
import { Download, Upload, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui";
import {
  backupFileName,
  parseDeskBackup,
  serializeDeskBackup,
  type BackupParseError,
  type BackupSummary,
  type PersistedDeskLike,
} from "@/lib/desk-backup";
import { deskText as c, type DeskCopyKey } from "@/lib/desk-copy";
import { LEVELS } from "@/lib/levels";
import {
  getPersistedDeskState,
  replacePersistedDeskState,
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
};

type PendingImport = {
  state: PersistedDeskLike;
  summary: BackupSummary;
};

export function DeskBackup({ compact = false }: { compact?: boolean }) {
  const lang = useLang();
  const hydrated = useDesk((s) => s.hydrated);
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<DeskCopyKey | null>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [snapshot, setSnapshot] = useState<PersistedDeskLike | null>(null);

  function downloadBackup() {
    const backup = serializeDeskBackup(getPersistedDeskState());
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = backupFileName();
    link.click();
    URL.revokeObjectURL(url);
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

  function confirmImport() {
    if (!pending) return;
    const before = getPersistedDeskState();
    replacePersistedDeskState(pending.state);
    setSnapshot(before);
    setPending(null);
    setMessage("importDone");
  }

  function undoImport() {
    if (!snapshot) return;
    replacePersistedDeskState(snapshot);
    setSnapshot(null);
    setMessage("importUndone");
  }

  return (
    <div className={compact ? "desk-backup desk-backup-compact" : "desk-backup"}>
      {!compact && <p className="backup-title">{c(lang, "backup")}</p>}
      <div className="backup-actions">
        <button
          type="button"
          className="backup-link"
          disabled={!hydrated}
          onClick={downloadBackup}
        >
          <Download size={14} aria-hidden="true" />
          {c(lang, "exportData")}
        </button>
        <button
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
          onChange={onPickFile}
        />
      </div>
      {pending && (
        <div className="backup-overlay" role="presentation">
          <div
            className="backup-panel"
            role="dialog"
            aria-modal="true"
            aria-label={c(lang, "importData")}
          >
            <p>{c(lang, "importHint")}</p>
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
              <Button type="button" onClick={confirmImport}>
                {c(lang, "importConfirm")}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setPending(null)}>
                {c(lang, "cancel")}
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="inline-feedback" role="status">
        {message && c(lang, message)}
        {snapshot && message === "importDone" && (
          <button type="button" onClick={undoImport}>
            <RotateCcw size={14} aria-hidden="true" />
            {c(lang, "importUndo")}
          </button>
        )}
      </div>
    </div>
  );
}
