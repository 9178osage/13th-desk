/**
 * Record shapes and the one set of rules for reading them back.
 *
 * `store.ts` (loading the saved desk) and `desk-backup.ts` (importing a backup file) both
 * have to answer the same question — "is this one saved record usable?" — and they used to
 * answer it differently: the loader kept a schedule whose `start` is not before `end` (the
 * week view then flags the row for the visitor to fix) and accepted any string id, while
 * the importer rejected both. A desk could therefore load and export fine, yet refuse to
 * import its own backup, which is the one thing a backup must never do. Both sides now
 * read records through the functions here.
 *
 * Reading preserves usable legacy contents: single-digit hours are padded, while invalid
 * clock values make the read lossy so callers protect the original. Anything needing
 * judgement (an inverted time range, a blank id) is surfaced in the UI rather than dropped.
 */
import { DESK_READ_CAP } from "./desk-limits.ts";
import { asStoredCredits, cleanDecimal, isLetter, type Letter } from "./gpa.ts";

export type WeekDay = "mon" | "tue" | "wed" | "thu" | "fri";

/**
 * Every note, grade and class carries `rowKey`: an internal, persisted identity that is
 * unique across the whole desk. The visible `id` may be shared or blank (saved desks and
 * backups keep it verbatim), so edits, deletes and cross-tab merges address a row by its
 * `rowKey` only. Older saves without one are keyed by `withRowKeys` when they are read.
 */
export type Note = { id: string; text: string; done: boolean; rowKey: string };

export type GradeRow = {
  id: string;
  title: string;
  credits: number;
  grade: Letter;
  boost: boolean;
  rowKey: string;
};

export type ScheduleBlock = {
  id: string;
  day: WeekDay;
  start: string;
  end: string;
  title: string;
  place: string;
  pinned: boolean;
  rowKey: string;
};

export type Bucket = {
  favs: string[];
  notes: Note[];
  checks: string[];
  grades: GradeRow[];
  priorGpa: string;
  priorWeighted: string;
  priorCredits: string;
  schedule: ScheduleBlock[];
};

export { asStoredCredits, isLetter };
export type { Letter };

/**
 * Generous ceiling for text read from an existing save or backup. The editor limits
 * (140-char notes, 60/80-char titles) are creation limits; an older or hand-corrected
 * desk may legitimately hold more, and silently cutting it would lose content the
 * importer claims to preserve. Anything beyond this is treated as unusable (lossy), so
 * a hostile multi-megabyte string cannot reach the DOM.
 */
export const MAX_READ_TEXT = 100_000;

/**
 * Text from a stored record. Missing fields read as ""; a string over MAX_READ_TEXT
 * returns null so the caller drops the record and marks the bucket lossy. The original
 * spacing is kept: trimming is not allowed to change content behind the visitor's back.
 */
export function asText(value: unknown): string | null {
  if (typeof value !== "string") return "";
  return value.length > MAX_READ_TEXT ? null : value;
}

/** A real clock time; legacy single-digit hours are normalized without losing a row. */
export function asHm(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(value.trim());
  if (!match || Number(match[1]) > 23) return null;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

/** Longest stored row key accepted as-is; longer or non-string keys are re-derived. */
export const MAX_ROW_KEY = 200;

export function isRowKey(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_ROW_KEY;
}

/** A stored key, or "" when it still has to be assigned (see `withRowKeys`). */
function readRowKey(value: unknown): string {
  return isRowKey(value) ? value : "";
}

/** A fresh key for a row created in this tab. */
export function newRowKey(): string {
  const id = globalThis.crypto?.randomUUID?.();
  return id ?? `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** The lists whose rows are edited one at a time and therefore need a row key. */
export const KEYED_LISTS = ["notes", "grades", "schedule"] as const;

/** Short, stable digest of a visible id (FNV-1a), so a long id never bloats a key. */
function digest(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Gives every note, grade and class of a stored desk state a unique `rowKey`, without
 * changing anything else. Rows that already have a valid key keep it. Rows without one
 * (saves and backups from before row keys) get a key derived only from where they sit
 * and their visible id (`legacy:<stage>:<list>:<id digest>:<occurrence>`), so every tab
 * that reads the same old save derives the same keys and a later three-way merge pairs
 * the rows correctly. A key that is already taken elsewhere on the desk (a hand-edited or
 * duplicated row) gets a `~n` suffix, deterministically by order. Works on the raw parsed
 * JSON, both the stage form (`{ buckets }`) and the legacy single-bucket form.
 */
export function withRowKeys<T>(state: T): T {
  if (!isPlainRecord(state)) return state;
  const used = new Set<string>();
  const claim = (key: string) => {
    let candidate = key;
    for (let n = 1; used.has(candidate); n++) candidate = `${key}~${n}`;
    used.add(candidate);
    return candidate;
  };
  const keyBucket = (bucket: unknown, stage: string): unknown => {
    if (!isPlainRecord(bucket)) return bucket;
    let out: Record<string, unknown> | null = null;
    for (const list of KEYED_LISTS) {
      const rows = bucket[list];
      if (!Array.isArray(rows) || rows.length > DESK_READ_CAP) continue;
      const seen = new Map<string, number>();
      let changed = false;
      const keyed = rows.map((row) => {
        if (!isPlainRecord(row)) return row;
        const id = typeof row.id === "string" ? row.id : "";
        const occurrence = seen.get(id) ?? 0;
        seen.set(id, occurrence + 1);
        const wanted = isRowKey(row.rowKey)
          ? row.rowKey
          : `legacy:${stage}:${list}:${digest(id)}:${occurrence}`;
        const key = claim(wanted);
        if (row.rowKey === key) return row;
        changed = true;
        return { ...row, rowKey: key };
      });
      if (changed) {
        out ??= { ...bucket };
        out[list] = keyed;
      }
    }
    return out ?? bucket;
  };
  const buckets = state.buckets;
  if (buckets === undefined) return keyBucket(state, "uni") as T; // legacy single bucket
  if (!isPlainRecord(buckets)) return state;
  const next: [string, unknown][] = Object.keys(buckets).map((stage) => [
    stage,
    keyBucket(buckets[stage], stage),
  ]);
  if (next.every(([stage, bucket]) => bucket === buckets[stage])) return state;
  return { ...state, buckets: Object.fromEntries(next) };
}

export function isWeekDay(value: unknown): value is WeekDay {
  return (
    value === "mon" || value === "tue" || value === "wed" || value === "thu" || value === "fri"
  );
}

export function asNote(value: unknown): Note | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const text = asText(raw.text);
  if (typeof raw.id !== "string" || text === null || !text.trim()) return null;
  return { id: raw.id, text, done: Boolean(raw.done), rowKey: readRowKey(raw.rowKey) };
}

export function asGrade(value: unknown): GradeRow | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const credits = asStoredCredits(raw.credits);
  const title = asText(raw.title);
  if (typeof raw.id !== "string" || !isLetter(raw.grade) || credits == null || title === null)
    return null;
  return {
    id: raw.id,
    title,
    credits,
    grade: raw.grade,
    boost: raw.boost === true,
    rowKey: readRowKey(raw.rowKey),
  };
}

/**
 * A grade row after an inline edit, or null when the new grade/credits could not be
 * stored (same rules as adding). The id and title stay; boost only exists for high school.
 */
export function editedGrade(
  row: GradeRow,
  patch: { grade: string; credits: number; boost: boolean },
  level: string,
): GradeRow | null {
  const credits = asStoredCredits(patch.credits);
  if (!isLetter(patch.grade) || credits == null) return null;
  return { ...row, grade: patch.grade, credits, boost: level === "high" && patch.boost };
}

/** `list` with `item` put back at `index` (clamped), so undo keeps the original order. */
export function insertAt<T>(list: readonly T[], item: T, index: number): T[] {
  const at = Number.isInteger(index) ? Math.min(Math.max(index, 0), list.length) : list.length;
  return [...list.slice(0, at), item, ...list.slice(at)];
}

export function asSchedule(value: unknown): ScheduleBlock | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const title = asText(raw.title);
  const place = asText(raw.place);
  const start = asHm(raw.start);
  const end = asHm(raw.end);
  if (
    typeof raw.id !== "string" ||
    !isWeekDay(raw.day) ||
    title === null ||
    place === null ||
    !title.trim() ||
    !start ||
    !end
  )
    return null;
  // No `start < end` test: an inverted range stays and is flagged in the week view,
  // because hiding a saved class is worse than showing it with a warning.
  return {
    id: raw.id,
    day: raw.day,
    start,
    end,
    title,
    place,
    pinned: raw.pinned === true,
    rowKey: readRowKey(raw.rowKey),
  };
}

/**
 * Read one bucket. `lossy` is true when the input held something this reader could not
 * keep — a field that is present but not an array, a record that would be dropped, or a
 * prior-GPA string that had to be trimmed away.
 *
 * The two callers want different things from the same answer, which is why both flags are
 * returned instead of a bare value: the save loader refuses a lossy bucket (it holds the
 * original file rather than overwriting it with less), while the backup importer reports
 * the loss to the visitor. Missing fields are not lossy — older saves simply lack them.
 */
export function parseBucket(value: unknown): { bucket: Bucket; lossy: boolean } {
  const isRecord = value !== null && typeof value === "object" && !Array.isArray(value);
  const raw = (isRecord ? value : {}) as Record<string, unknown>;
  let lossy = !isRecord;
  const list = <T>(field: unknown, parse: (item: unknown) => T | null): T[] => {
    if (field === undefined) return [];
    if (!Array.isArray(field) || field.length > DESK_READ_CAP) {
      // Over the cap is unusable, same as a non-array: callers hold the original
      // instead of rendering a bomb. Check length before walking the items.
      lossy = true;
      return [];
    }
    const out = field.map(parse).filter((item): item is T => item !== null);
    if (out.length !== field.length) lossy = true;
    return out;
  };
  const asString = (item: unknown) => (typeof item === "string" ? item : null);
  // Prior-GPA fields are text the visitor typed, and `cleanDecimal` already coerces a
  // non-string to "" — the loader has always done that, so treating it as loss here would
  // newly condemn saves that used to load (and could not represent the value anyway).
  // Only a string that has to be trimmed is worth reporting, since that is real content.
  const prior = (field: unknown, max: number, fallback: string) => {
    if (typeof field !== "string") return fallback;
    const cleaned = cleanDecimal(field, max);
    if (cleaned !== field) lossy = true;
    return cleaned;
  };
  return {
    bucket: {
      favs: list(raw.favs, asString),
      notes: list(raw.notes, asNote),
      checks: list(raw.checks, asString),
      grades: list(raw.grades, asGrade),
      priorGpa: prior(raw.priorGpa, 4, ""),
      priorWeighted: prior(raw.priorWeighted, 4, ""),
      priorCredits: prior(raw.priorCredits, 6, ""),
      schedule: list(raw.schedule, asSchedule),
    },
    lossy,
  };
}

export function emptyBucket(): Bucket {
  return {
    favs: [],
    notes: [],
    checks: [],
    grades: [],
    priorGpa: "",
    priorWeighted: "",
    priorCredits: "",
    schedule: [],
  };
}
