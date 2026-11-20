import {
  parsePersistedDesk,
  summarizeDeskState,
  type BackupSummary,
  type PersistedDeskLike,
} from "./desk-backup.ts";
import { DESK_STORAGE_VERSION } from "./desk-storage.ts";
import {
  isRecoveryKey,
  RECOVERY_EVENT,
  RECOVERY_PREFIX,
  unwrapRecoveryCopy,
  type RecoverySource,
} from "./recovery-format.ts";

export { RECOVERY_EVENT, RECOVERY_PREFIX, isRecoveryKey };

/** One copy as the "Local recovery copies" list shows it. */
export type RecoveryCopy = {
  key: string;
  createdAt: string | null;
  source: RecoverySource | "unknown";
  /** Exactly what was kept; this is what "Download" saves. */
  raw: string;
  /** The desk it holds, read by the same reader as the save itself; null when unreadable. */
  state: PersistedDeskLike | null;
  summary: BackupSummary | null;
};

type ListStorage = Pick<Storage, "length" | "key" | "getItem">;

/**
 * The desk inside a kept value, or null. Only a value the save loader itself would load
 * (`parsePersistedDesk`, stored mode, same version) can be restored; anything else is
 * offered for download only.
 */
export function readRecoveryState(raw: string): PersistedDeskLike | null {
  try {
    const value = JSON.parse(raw) as { state?: unknown; version?: unknown } | null;
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    if (value.version !== undefined && value.version !== DESK_STORAGE_VERSION) return null;
    return parsePersistedDesk(value.state, "stored");
  } catch {
    return null;
  }
}

export function readRecoveryCopy(key: string, stored: string): RecoveryCopy {
  const { createdAt, source, raw } = unwrapRecoveryCopy(stored);
  const state = readRecoveryState(raw);
  return { key, createdAt, source, raw, state, summary: state ? summarizeDeskState(state) : null };
}

/** Every copy under `13th-desk-v1:recovery:`, newest first (unknown dates last). */
export function listRecoveryCopies(storage: ListStorage): RecoveryCopy[] {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (isRecoveryKey(key)) keys.push(key);
  }
  const copies: RecoveryCopy[] = [];
  for (const key of keys) {
    const stored = storage.getItem(key);
    if (stored !== null) copies.push(readRecoveryCopy(key, stored));
  }
  return copies.sort((a, b) => {
    if (a.createdAt && b.createdAt && a.createdAt !== b.createdAt)
      return a.createdAt < b.createdAt ? 1 : -1;
    if (a.createdAt && !b.createdAt) return -1;
    if (!a.createdAt && b.createdAt) return 1;
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  });
}

/** Remove one copy. Refuses any key outside the recovery prefix. */
export function deleteRecoveryCopy(storage: Pick<Storage, "removeItem">, key: string): boolean {
  if (!isRecoveryKey(key)) return false;
  try {
    storage.removeItem(key);
    notifyRecoveryListeners();
    return true;
  } catch {
    return false;
  }
}

export function notifyRecoveryListeners() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(RECOVERY_EVENT));
  } catch {
    /* no Event constructor */
  }
}

export function recoveryFileName(copy: Pick<RecoveryCopy, "key" | "createdAt">): string {
  if (copy.createdAt) {
    const date = new Date(copy.createdAt);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `eugene-desk-recovery-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}.json`;
  }
  const id = copy.key
    .slice(RECOVERY_PREFIX.length)
    .replace(/[^A-Za-z0-9-]/g, "")
    .slice(0, 12);
  return `eugene-desk-recovery-${id || "copy"}.json`;
}

/** Save the kept bytes exactly as they were stored. */
export function downloadRecoveryCopy(copy: Pick<RecoveryCopy, "key" | "createdAt" | "raw">) {
  if (typeof document === "undefined") return;
  const blob = new Blob([copy.raw], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = recoveryFileName(copy);
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
