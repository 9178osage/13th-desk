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
import { asStoredCredits, cleanDecimal, isLetter, type Letter } from "./gpa.ts";
import { isLevel, type Level } from "./levels.ts";
import { validScheduleTime } from "./schedule.ts";
export type Lang = "en" | "zh" | "es" | "ko" | "vi" | "ja";
function isLang(value: unknown): value is Lang {
  return value === "en" || value === "zh" || value === "es" || value === "ko" || value === "vi" || value === "ja";
}

export const DESK_STORAGE_KEY = "13th-desk-v1" as const;
export const DESK_BACKUP_APP = "Eugene Desk" as const;
export const DESK_BACKUP_FORMAT = 1 as const;

type WeekDay = "mon" | "tue" | "wed" | "thu" | "fri";

type Note = { id: string; text: string; done: boolean };
type GradeRow = {
  id: string;
  title: string;
  credits: number;
  grade: Letter;
  boost: boolean;
};
type ScheduleBlock = {
  id: string;
  day: WeekDay;
  start: string;
  end: string;
  title: string;
  place: string;
  pinned: boolean;
};
type Bucket = {
  favs: string[];
  notes: Note[];
  checks: string[];
  grades: GradeRow[];
  priorGpa: string;
  priorWeighted: string;
  priorCredits: string;
  schedule: ScheduleBlock[];
};

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

export type BackupParseError =
  | "json"
  | "shape"
  | "version"
  | "stages"
  | "times"
  | "grades";

export type BackupParseResult =
  | { ok: true; backup: DeskBackupFile; summary: BackupSummary }
  | { ok: false; error: BackupParseError };

const LEVELS: Level[] = ["elem", "mid", "high", "uni"];

function asText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  return value.trim().slice(0, max);
}

function isWeekDay(value: unknown): value is WeekDay {
  return value === "mon" || value === "tue" || value === "wed" || value === "thu" || value === "fri";
}

function asHmStrict(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  return value;
}

function parseNote(value: unknown): Note | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const text = asText(raw.text, 140);
  if (typeof raw.id !== "string" || !raw.id || !text) return null;
  if (typeof raw.done !== "boolean") return null;
  return { id: raw.id, text, done: raw.done };
}

function parseGrade(value: unknown): GradeRow | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const credits = asStoredCredits(raw.credits);
  if (typeof raw.id !== "string" || !raw.id || !isLetter(raw.grade) || credits == null) return null;
  if (typeof raw.boost !== "boolean") return null;
  const title = asText(raw.title, 80);
  if (title == null) return null;
  return { id: raw.id, title, credits, grade: raw.grade, boost: raw.boost };
}

function parseSchedule(value: unknown): ScheduleBlock | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const title = asText(raw.title, 60);
  const start = asHmStrict(raw.start);
  const end = asHmStrict(raw.end);
  if (typeof raw.id !== "string" || !raw.id || !isWeekDay(raw.day) || !title || !start || !end) {
    return null;
  }
  if (!validScheduleTime(start, end)) return null;
  if (typeof raw.pinned !== "boolean") return null;
  const place = asText(raw.place, 60);
  if (place == null) return null;
  return { id: raw.id, day: raw.day, start, end, title, place, pinned: raw.pinned };
}

function parseStringList(value: unknown, max: number): string[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length > max) return null;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    out.push(item);
  }
  return out;
}

function parseBucket(value: unknown): Bucket | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.notes) || raw.notes.length > 20) return null;
  if (!Array.isArray(raw.grades) || raw.grades.length > 40) return null;
  if (!Array.isArray(raw.schedule) || raw.schedule.length > 40) return null;
  const notes: Note[] = [];
  for (const item of raw.notes) {
    const note = parseNote(item);
    if (!note) return null;
    notes.push(note);
  }
  const grades: GradeRow[] = [];
  for (const item of raw.grades) {
    const grade = parseGrade(item);
    if (!grade) return null;
    grades.push(grade);
  }
  const schedule: ScheduleBlock[] = [];
  for (const item of raw.schedule) {
    const row = parseSchedule(item);
    if (!row) return null;
    schedule.push(row);
  }
  const favs = parseStringList(raw.favs, 80);
  const checks = parseStringList(raw.checks, 40);
  if (!favs || !checks) return null;
  if (typeof raw.priorGpa !== "string" || typeof raw.priorWeighted !== "string") return null;
  if (typeof raw.priorCredits !== "string") return null;
  return {
    favs,
    notes,
    checks,
    grades,
    priorGpa: cleanDecimal(raw.priorGpa, 4),
    priorWeighted: cleanDecimal(raw.priorWeighted, 4),
    priorCredits: cleanDecimal(raw.priorCredits, 6),
    schedule,
  };
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

