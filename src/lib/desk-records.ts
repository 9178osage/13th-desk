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
import { asStoredCredits, cleanDecimal, isLetter, type Letter } from "./gpa.ts";

export type WeekDay = "mon" | "tue" | "wed" | "thu" | "fri";

export type Note = { id: string; text: string; done: boolean };

export type GradeRow = {
  id: string;
  title: string;
  credits: number;
  grade: Letter;
  boost: boolean;
};

export type ScheduleBlock = {
  id: string;
  day: WeekDay;
  start: string;
  end: string;
  title: string;
  place: string;
  pinned: boolean;
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
  return { id: raw.id, text, done: Boolean(raw.done) };
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
    if (!Array.isArray(field)) {
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
