const DISTRICT_IDS = [
  "4j",
  "bethel",
  "springfield",
  "creswell",
  "crow",
  "fern",
  "harrisburg",
  "junction",
  "lowell",
  "marcola",
  "monroe",
  "pleasant",
  "southlane",
  "sweethome",
] as const;
type DistrictId = (typeof DISTRICT_IDS)[number];
function isDistrict(value: unknown): value is DistrictId {
  return typeof value === "string" && (DISTRICT_IDS as readonly string[]).includes(value);
}
import { asStoredCredits, isLetter } from "./gpa.ts";
import type { Bucket } from "./desk-records.ts";
import { parseBucket as parseBucketShared } from "./desk-records.ts";
import { LEVEL_IDS as LEVELS, isLevel, type Level } from "./levels.ts";
import { validScheduleTime } from "./schedule.ts";
export type Lang = "en" | "zh" | "es" | "ko" | "vi" | "ja";
function isLang(value: unknown): value is Lang {
  return (
    value === "en" ||
    value === "zh" ||
    value === "es" ||
    value === "ko" ||
    value === "vi" ||
    value === "ja"
  );
}

export const DESK_STORAGE_KEY = "13th-desk-v1" as const;
export const DESK_PRE_IMPORT_KEY = "13th-desk-v1:pre-import" as const;
export const DESK_PRE_IMPORT_EVENT = "eugene-desk-pre-import" as const;
export const DESK_BACKUP_APP = "Eugene Desk" as const;
export const DESK_BACKUP_FORMAT = 1 as const;

export type PersistedDeskLike = {
  lang: Lang;
  langSet: boolean;
  level: Level;
  levelSet: boolean;
  earlyStart: boolean;
  district: DistrictId | null;
  buckets: Record<Level, Bucket>;
};

export type DeskBackupFile = {
  app: typeof DESK_BACKUP_APP;
  formatVersion: typeof DESK_BACKUP_FORMAT;
  exportedAt: string;
  storageKey: typeof DESK_STORAGE_KEY;
  state: PersistedDeskLike;
};

export type StageCounts = {
  notes: number;
  schedule: number;
  grades: number;
  favs: number;
};

export type BackupSummary = {
  lang: Lang;
  level: Level;
  stages: Record<Level, StageCounts>;
  totalNotes: number;
  totalClasses: number;
  totalGrades: number;
};

export type BackupParseError = "json" | "shape" | "version" | "stages" | "times" | "grades";

export type BackupParseResult =
  | { ok: true; backup: DeskBackupFile; summary: BackupSummary }
  | { ok: false; error: BackupParseError };

/** Used only to name the failing part of a rejected file; reading itself is shared. */
function asHmStrict(value: unknown): string | null {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : null;
}

/**
 * One bucket from a backup file. Import accepts exactly what the save loader accepts, so a
 * desk that loads can always be restored from its own export; the record rules live in
 * `desk-records.ts` and are shared with `store.ts` rather than duplicated here.
 *
 * Stricter than the loader in one place on purpose: a field that is present but not an
 * array, or a record that would be dropped, fails the import so the visitor is told which
 * part is unusable instead of silently restoring less than the file holds.
 */
function parseBucket(value: unknown): Bucket | null {
  const { bucket, lossy } = parseBucketShared(value);
  return lossy ? null : bucket;
}

function parseState(value: unknown): PersistedDeskLike | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (!isLang(raw.lang) || typeof raw.langSet !== "boolean") return null;
  if (!isLevel(raw.level) || typeof raw.levelSet !== "boolean") return null;
  if (typeof raw.earlyStart !== "boolean") return null;
  let district: DistrictId | null = null;
  if (raw.district === null) district = null;
  else if (isDistrict(raw.district)) district = raw.district;
  else return null;
  if (!raw.buckets || typeof raw.buckets !== "object") return null;
  const stored = raw.buckets as Record<string, unknown>;
  const buckets = {} as Record<Level, Bucket>;
  for (const id of LEVELS) {
    if (!(id in stored)) return null;
    const bucket = parseBucket(stored[id]);
    if (!bucket) return null;
    buckets[id] = bucket;
  }
  for (const key of Object.keys(stored)) {
    if (!LEVELS.includes(key as Level)) return null;
  }
  return {
    lang: raw.lang,
    langSet: raw.langSet,
    level: raw.level,
    levelSet: raw.levelSet,
    earlyStart: raw.earlyStart,
    district,
    buckets,
  };
}

export function summarizeDeskState(state: PersistedDeskLike): BackupSummary {
  const stages = {} as Record<Level, StageCounts>;
  let totalNotes = 0;
  let totalClasses = 0;
  let totalGrades = 0;
  for (const id of LEVELS) {
    const bucket = state.buckets[id];
    stages[id] = {
      notes: bucket.notes.length,
      schedule: bucket.schedule.length,
      grades: bucket.grades.length,
      favs: bucket.favs.length,
    };
    totalNotes += bucket.notes.length;
    totalClasses += bucket.schedule.length;
    totalGrades += bucket.grades.length;
  }
  return {
    lang: state.lang,
    level: state.level,
    stages,
    totalNotes,
    totalClasses,
    totalGrades,
  };
}

export function serializeDeskBackup(
  state: PersistedDeskLike,
  exportedAt = new Date().toISOString(),
): DeskBackupFile {
  return {
    app: DESK_BACKUP_APP,
    formatVersion: DESK_BACKUP_FORMAT,
    exportedAt,
    storageKey: DESK_STORAGE_KEY,
    state,
  };
}

export function backupFileName(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `eugene-desk-backup-${y}-${m}-${d}.json`;
}

export function parseDeskBackup(raw: string): BackupParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "json" };
  }
  if (!parsed || typeof parsed !== "object") return { ok: false, error: "shape" };
  const file = parsed as Record<string, unknown>;
  if (file.app !== DESK_BACKUP_APP) return { ok: false, error: "shape" };
  if (file.storageKey !== DESK_STORAGE_KEY) return { ok: false, error: "shape" };
  if (typeof file.exportedAt !== "string" || !file.exportedAt.trim()) {
    return { ok: false, error: "shape" };
  }
  if (file.formatVersion !== DESK_BACKUP_FORMAT) {
    if (typeof file.formatVersion === "number") return { ok: false, error: "version" };
    return { ok: false, error: "shape" };
  }
  const state = parseState(file.state);
  if (!state) {
    if (!file.state || typeof file.state !== "object") return { ok: false, error: "shape" };
    const buckets = (file.state as Record<string, unknown>).buckets;
    if (!buckets || typeof buckets !== "object") return { ok: false, error: "stages" };
    if (Object.keys(buckets).some((key) => !isLevel(key))) return { ok: false, error: "stages" };
    for (const id of LEVELS) {
      if (!(id in (buckets as object))) return { ok: false, error: "stages" };
    }
    for (const id of LEVELS) {
      const bucket = (buckets as Record<string, unknown>)[id];
      if (!bucket || typeof bucket !== "object") return { ok: false, error: "stages" };
      const schedule = (bucket as Record<string, unknown>).schedule;
      if (Array.isArray(schedule)) {
        for (const row of schedule) {
          if (!row || typeof row !== "object") return { ok: false, error: "times" };
          const start = (row as Record<string, unknown>).start;
          const end = (row as Record<string, unknown>).end;
          if (typeof start === "string" && typeof end === "string") {
            if (!asHmStrict(start) || !asHmStrict(end) || !validScheduleTime(start, end)) {
              return { ok: false, error: "times" };
            }
          } else {
            return { ok: false, error: "times" };
          }
        }
      }
      const grades = (bucket as Record<string, unknown>).grades;
      if (Array.isArray(grades)) {
        for (const row of grades) {
          if (!row || typeof row !== "object") return { ok: false, error: "grades" };
          if (!isLetter((row as Record<string, unknown>).grade)) {
            return { ok: false, error: "grades" };
          }
          if (asStoredCredits((row as Record<string, unknown>).credits) == null) {
            return { ok: false, error: "grades" };
          }
        }
      }
    }
    return { ok: false, error: "shape" };
  }
  return {
    ok: true,
    backup: {
      app: DESK_BACKUP_APP,
      formatVersion: DESK_BACKUP_FORMAT,
      exportedAt: file.exportedAt,
      storageKey: DESK_STORAGE_KEY,
      state,
    },
    summary: summarizeDeskState(state),
  };
}

/** Undo stays offered while a pre-import snapshot exists; later status messages do not hide it. */
export function importUndoOffered(hasSnapshot: boolean): boolean {
  return hasSnapshot;
}

export function beforeImportFileName(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `eugene-desk-before-import-${y}-${m}-${d}-${hh}${mm}.json`;
}

export function downloadDeskBackupFile(state: PersistedDeskLike, filename: string): void {
  if (typeof document === "undefined") return;
  const backup = serializeDeskBackup(state);
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  // Match ics.ts / lock-screen.ts: the link has to be in the document for every browser to
  // start the download, and the blob URL must outlive the click.
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function notifyPreImportListeners() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(DESK_PRE_IMPORT_EVENT));
  } catch {
    /* jsdom / node without Event */
  }
}

export function readPreImportSnapshot(): PersistedDeskLike | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DESK_PRE_IMPORT_KEY);
    if (!raw) return null;
    const parsed = parseDeskBackup(raw);
    return parsed.ok ? parsed.backup.state : null;
  } catch {
    return null;
  }
}

export function clearPreImportSnapshot(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DESK_PRE_IMPORT_KEY);
  } catch {
    /* ignore */
  }
  notifyPreImportListeners();
}

/** Persist snapshot for undo-after-reload. Returns false when storage quota blocks the write. */
export function writePreImportSnapshot(state: PersistedDeskLike): boolean {
  if (typeof window === "undefined") return false;
  const payload = JSON.stringify(serializeDeskBackup(state));
  try {
    localStorage.setItem(DESK_PRE_IMPORT_KEY, payload);
    notifyPreImportListeners();
    return true;
  } catch {
    try {
      localStorage.removeItem(DESK_PRE_IMPORT_KEY);
    } catch {
      /* ignore */
    }
    notifyPreImportListeners();
    return false;
  }
}
