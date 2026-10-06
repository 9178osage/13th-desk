import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware";
import { isLevel, type Level } from "@/lib/levels";
import { isDistrict, type DistrictId } from "@/data/districts";
import { asStoredCredits, cleanDecimal, isLetter, type Letter } from "@/lib/gpa";
import {
  isLang,
  isLangReady,
  langPackVersion,
  loadLangPack,
  subscribeLangPacks,
  type Lang,
} from "@/lib/text";
import { validScheduleTime, type ScheduleDraft } from "@/lib/schedule";
import type { PersistedDeskLike } from "@/lib/desk-backup";


/** Chinese-first portal: the language used until a visitor picks one. */
export const DEFAULT_LANG: Lang = "zh";
export type Note = {
  id: string;
  text: string;
  done: boolean;
};

export type GradeRow = {
  id: string;
  title: string;
  credits: number;
  grade: Letter;
  boost: boolean;
};

export type WeekDay = "mon" | "tue" | "wed" | "thu" | "fri";

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

type DeskState = {
  lang: Lang;
  langSet: boolean;
  level: Level;
  levelSet: boolean;
  buckets: Record<Level, Bucket>;
  hydrated: boolean;
  earlyStart: boolean;
  district: DistrictId | null;
  setLang: (lang: Lang) => void;
  setLevel: (level: Level) => void;
  setSetup: (patch: { lang?: Lang; level?: Level }) => void;
  setEarlyStart: (on: boolean) => void;
  setDistrict: (id: DistrictId | null) => void;
  toggleFav: (id: string) => void;
  addNote: (text: string) => boolean;
  restoreNote: (note: Note, level: Level) => boolean;
  toggleNote: (id: string) => void;
  removeNote: (id: string) => void;
  toggleCheck: (id: string) => void;
  addGrade: (row: { title: string; credits: number; grade: string; boost: boolean }) => void;
  removeGrade: (id: string) => void;
  clearGrades: () => void;
  setGpaPrior: (patch: { gpa?: string; weighted?: string; credits?: string }) => void;
  addScheduleBlock: (row: ScheduleDraft) => boolean;
  updateScheduleBlock: (id: string, row: ScheduleDraft) => boolean;
  restoreScheduleBlock: (row: ScheduleBlock, level: Level) => boolean;
  removeScheduleBlock: (id: string) => void;
  toggleSchedulePin: (id: string) => void;
};

export const WEEK_DAYS: { id: WeekDay; en: string; zh: string }[] = [
  { id: "mon", en: "Mon", zh: "一" },
  { id: "tue", en: "Tue", zh: "二" },
  { id: "wed", en: "Wed", zh: "三" },
  { id: "thu", en: "Thu", zh: "四" },
  { id: "fri", en: "Fri", zh: "五" },
];

export function weekdayToScheduleDay(weekday: number): WeekDay | null {
  // JS: 0 Sun … 6 Sat
  const map: Record<number, WeekDay> = { 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri" };
  return map[weekday] ?? null;
}

function blankBucket(): Bucket {
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

function blankBuckets(): Record<Level, Bucket> {
  return { elem: blankBucket(), mid: blankBucket(), high: blankBucket(), uni: blankBucket() };
}

function asText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function asNote(value: unknown): Note | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const text = asText(raw.text, 140);
  if (typeof raw.id !== "string" || !text) return null;
  return { id: raw.id, text, done: Boolean(raw.done) };
}

function asGrade(value: unknown): GradeRow | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const credits = asStoredCredits(raw.credits);
  if (typeof raw.id !== "string" || !isLetter(raw.grade) || credits == null) return null;
  return {
    id: raw.id,
    title: asText(raw.title, 80),
    credits,
    grade: raw.grade,
    boost: raw.boost === true,
  };
}

function isWeekDay(value: unknown): value is WeekDay {
  return (
    value === "mon" || value === "tue" || value === "wed" || value === "thu" || value === "fri"
  );
}

function asHm(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!/^\d{1,2}:\d{2}$/.test(value)) return null;
  const [h, m] = value.split(":").map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function asSchedule(value: unknown): ScheduleBlock | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const title = asText(raw.title, 60);
  const start = asHm(raw.start);
  const end = asHm(raw.end);
  if (typeof raw.id !== "string" || !isWeekDay(raw.day) || !title || !start || !end) return null;
  return {
    id: raw.id,
    day: raw.day,
    start,
    end,
    title,
    place: asText(raw.place, 60),
    pinned: raw.pinned === true,
  };
}

function asBucket(value: unknown): Bucket | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const notes = Array.isArray(raw.notes)
    ? raw.notes
        .map(asNote)
        .filter((item): item is Note => item !== null)
        .slice(0, 20)
    : [];
  const favs = Array.isArray(raw.favs)
    ? raw.favs.filter((item): item is string => typeof item === "string").slice(0, 80)
    : [];
  const checks = Array.isArray(raw.checks)
    ? raw.checks.filter((item): item is string => typeof item === "string").slice(0, 40)
    : [];
  const grades = Array.isArray(raw.grades)
    ? raw.grades
        .map(asGrade)
        .filter((item): item is GradeRow => item !== null)
        .slice(0, 40)
    : [];
  const schedule = Array.isArray(raw.schedule)
    ? raw.schedule
        .map(asSchedule)
        .filter((item): item is ScheduleBlock => item !== null)
        .slice(0, 40)
    : [];
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

type PersistedDesk = {
  lang: Lang;
  langSet: boolean;
  level: Level;
  levelSet: boolean;
  earlyStart: boolean;
  district: DistrictId | null;
  buckets: Record<Level, Bucket>;
};

/**
 * Persist after paint: zustand's default storage JSON.stringify + localStorage.setItem
 * runs in the same turn as set(), which delays the language-switch frame.
 */
export const useStorageStatus = create<{ failed: boolean }>(() => ({ failed: false }));

function createDeferredJsonStorage(): PersistStorage<PersistedDesk> {
  let pending: { name: string; value: StorageValue<PersistedDesk> } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let idleHandle: number | null = null;
  let readFailed = false;

  const cancelSchedule = () => {
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
    if (idleHandle != null && typeof cancelIdleCallback === "function") {
      cancelIdleCallback(idleHandle);
      idleHandle = null;
    }
  };

  const flush = () => {
    timer = null;
    idleHandle = null;
    const job = pending;
    pending = null;
    if (!job || typeof window === "undefined") return;
    // A corrupt or inaccessible saved desk must not be overwritten with an empty one.
    if (readFailed) {
      useStorageStatus.setState({ failed: true });
      return;
    }
    try {
      localStorage.setItem(job.name, JSON.stringify(job.value));
      useStorageStatus.setState({ failed: false });
    } catch {
      useStorageStatus.setState({ failed: true });
    }
  };

  // Flush the latest edit before a tab is hidden or closed, not just at idle.
  if (typeof window !== "undefined") {
    const flushPending = () => {
      cancelSchedule();
      flush();
    };
    window.addEventListener("pagehide", flushPending);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flushPending();
    });
  }

  const schedule = () => {
    if (timer != null || idleHandle != null) return;
    // Prefer idle callback when available; timeout keeps writes snappy.
    if (typeof requestIdleCallback === "function") {
      idleHandle = requestIdleCallback(flush, { timeout: 120 });
    } else {
      timer = setTimeout(flush, 0);
    }
  };

  return {
    getItem: (name) => {
      if (pending?.name === name) return pending.value;
      if (typeof window === "undefined") return null;
      try {
        const raw = localStorage.getItem(name);
        if (!raw) return null;
        return JSON.parse(raw) as StorageValue<PersistedDesk>;
      } catch {
        readFailed = true;
        useStorageStatus.setState({ failed: true });
        return null;
      }
    },
    setItem: (name, value) => {
      pending = { name, value };
      schedule();
    },
    removeItem: (name) => {
      cancelSchedule();
      pending = null;
      if (typeof window === "undefined") return;
      try {
        localStorage.removeItem(name);
      } catch {
        /* ignore */
      }
    },
  };
}

export const useDesk = create<DeskState>()(
  persist(
    (set, get) => ({
      lang: DEFAULT_LANG,
      langSet: false,
      level: "uni",
      levelSet: false,
      buckets: blankBuckets(),
      hydrated: false,
      earlyStart: false,
      district: null,
      setLang: (lang) => {
        if (!isLang(lang)) return;
        const cur = get();
        if (cur.lang === lang && cur.langSet) return;
        set({ lang, langSet: true });
      },
      setLevel: (level) => {
        if (!isLevel(level)) return;
        const cur = get();
        if (cur.level === level && cur.levelSet) return;
        set({ level, levelSet: true });
      },
      setSetup: (patch) => {
        const cur = get();
        const next: Partial<DeskState> = {};
        if (patch.lang !== undefined) {
          if (!isLang(patch.lang)) return;
          if (cur.lang !== patch.lang || !cur.langSet) {
            next.lang = patch.lang;
            next.langSet = true;
          }
        }
        if (patch.level !== undefined) {
          if (!isLevel(patch.level)) return;
          if (cur.level !== patch.level || !cur.levelSet) {
            next.level = patch.level;
            next.levelSet = true;
          }
        }
        if (Object.keys(next).length) set(next);
      },
      setEarlyStart: (on) => set({ earlyStart: on }),
      setDistrict: (id) => {
        if (id !== null && !isDistrict(id)) return;
        set({ district: id });
      },
      toggleFav: (id) => {
        const { level, buckets } = get();
        const bucket = buckets[level];
        const has = bucket.favs.includes(id);
        if (!has && bucket.favs.length >= 80) return;
        const favs = has ? bucket.favs.filter((item) => item !== id) : [...bucket.favs, id];
        set({ buckets: { ...buckets, [level]: { ...bucket, favs } } });
      },
      addNote: (text) => {
        const clean = text.trim().slice(0, 140);
        const { level, buckets } = get();
        const bucket = buckets[level];
        if (!clean || bucket.notes.length >= 20) return false;
        set({
          buckets: {
            ...buckets,
            [level]: {
              ...bucket,
              notes: [{ id: crypto.randomUUID(), text: clean, done: false }, ...bucket.notes],
            },
          },
        });
        return true;
      },
      restoreNote: (note, level) => {
        const { buckets } = get();
        const bucket = buckets[level];
        if (bucket.notes.length >= 20 || bucket.notes.some((item) => item.id === note.id))
          return false;
        set({ buckets: { ...buckets, [level]: { ...bucket, notes: [note, ...bucket.notes] } } });
        return true;
      },
      toggleNote: (id) => {
        const { level, buckets } = get();
        const bucket = buckets[level];
        set({
          buckets: {
            ...buckets,
            [level]: {
              ...bucket,
              notes: bucket.notes.map((note) =>
                note.id === id ? { ...note, done: !note.done } : note,
              ),
            },
          },
        });
      },
      removeNote: (id) => {
        const { level, buckets } = get();
        const bucket = buckets[level];
        set({
          buckets: {
            ...buckets,
            [level]: { ...bucket, notes: bucket.notes.filter((note) => note.id !== id) },
          },
        });
      },
      toggleCheck: (id) => {
        const { level, buckets } = get();
        const bucket = buckets[level];
        const has = bucket.checks.includes(id);
        if (!has && bucket.checks.length >= 40) return;
        const checks = has ? bucket.checks.filter((item) => item !== id) : [...bucket.checks, id];
        set({ buckets: { ...buckets, [level]: { ...bucket, checks } } });
      },
      addGrade: (row) => {
        const credits = asStoredCredits(row.credits);
        if (!isLetter(row.grade) || credits == null) return;
        const { level, buckets } = get();
        const bucket = buckets[level];
        if (bucket.grades.length >= 40) return;
        const next: GradeRow = {
          id: crypto.randomUUID(),
          title: row.title.trim().slice(0, 80),
          credits,
          grade: row.grade,
          boost: level === "high" && row.boost,
        };
        set({
          buckets: {
            ...buckets,
            [level]: { ...bucket, grades: [...bucket.grades, next] },
          },
        });
      },
      removeGrade: (id) => {
        const { level, buckets } = get();
        const bucket = buckets[level];
        set({
          buckets: {
            ...buckets,
            [level]: { ...bucket, grades: bucket.grades.filter((item) => item.id !== id) },
          },
        });
      },
      clearGrades: () => {
        const { level, buckets } = get();
        set({
          buckets: {
            ...buckets,
            [level]: { ...buckets[level], grades: [] },
          },
        });
      },
      setGpaPrior: (patch) => {
        const { level, buckets } = get();
        const bucket = buckets[level];
        set({
          buckets: {
            ...buckets,
            [level]: {
              ...bucket,
              priorGpa: patch.gpa === undefined ? bucket.priorGpa : cleanDecimal(patch.gpa, 4),
              priorWeighted:
                patch.weighted === undefined
                  ? bucket.priorWeighted
                  : cleanDecimal(patch.weighted, 4),
              priorCredits:
                patch.credits === undefined ? bucket.priorCredits : cleanDecimal(patch.credits, 6),
            },
          },
        });
      },
      addScheduleBlock: (row) => {
        const title = row.title.trim().slice(0, 60);
        const start = asHm(row.start);
        const end = asHm(row.end);
        if (!title || !start || !end || !isWeekDay(row.day) || !validScheduleTime(start, end))
          return false;
        const { level, buckets } = get();
        const bucket = buckets[level];
        if (bucket.schedule.length >= 40) return false;
        const next: ScheduleBlock = {
          id: crypto.randomUUID(),
          day: row.day,
          start,
          end,
          title,
          place: row.place.trim().slice(0, 60),
          pinned: false,
        };
        set({
          buckets: {
            ...buckets,
            [level]: { ...bucket, schedule: [...bucket.schedule, next] },
          },
        });
        return true;
      },
      updateScheduleBlock: (id, row) => {
        const title = row.title.trim().slice(0, 60);
        const start = asHm(row.start);
        const end = asHm(row.end);
        if (!title || !start || !end || !isWeekDay(row.day) || !validScheduleTime(start, end))
          return false;
        const { level, buckets } = get();
        const bucket = buckets[level];
        if (!bucket.schedule.some((item) => item.id === id)) return false;
        const schedule = bucket.schedule.map((item) =>
          item.id === id
            ? { ...item, day: row.day, title, start, end, place: row.place.trim().slice(0, 60) }
            : item,
        );
        set({ buckets: { ...buckets, [level]: { ...bucket, schedule } } });
        return true;
      },
      restoreScheduleBlock: (row, level) => {
        const { buckets } = get();
        const bucket = buckets[level];
        if (bucket.schedule.length >= 40 || bucket.schedule.some((item) => item.id === row.id))
          return false;
        set({
          buckets: { ...buckets, [level]: { ...bucket, schedule: [...bucket.schedule, row] } },
        });
        return true;
      },
      removeScheduleBlock: (id) => {
        const { level, buckets } = get();
        const bucket = buckets[level];
        set({
          buckets: {
            ...buckets,
            [level]: { ...bucket, schedule: bucket.schedule.filter((item) => item.id !== id) },
          },
        });
      },
      toggleSchedulePin: (id) => {
        const { level, buckets } = get();
        const bucket = buckets[level];
        set({
          buckets: {
            ...buckets,
            [level]: {
              ...bucket,
              schedule: bucket.schedule.map((item) =>
                item.id === id ? { ...item, pinned: !item.pinned } : item,
              ),
            },
          },
        });
      },
    }),
    {
      name: "13th-desk-v1",
      skipHydration: true,
      storage: createDeferredJsonStorage(),
      partialize: (state) => ({
        lang: state.lang,
        langSet: state.langSet,
        level: state.level,
        levelSet: state.levelSet,
        earlyStart: state.earlyStart,
        district: state.district,
        buckets: state.buckets,
      }),
      merge: (persisted, current) => {
        if (!persisted || typeof persisted !== "object") return current;
        const raw = persisted as Record<string, unknown>;
        // Prefer in-memory choices made before rehydrate finishes (fast lang switch).
        const langSet = current.langSet || raw.langSet === true;
        // Never chosen? Keep the Chinese-first default instead of flipping to English
        // after the first save (bug: a new visitor's desk switched language on reload).
        const lang = current.langSet
          ? current.lang
          : langSet && isLang(raw.lang)
            ? raw.lang
            : DEFAULT_LANG;
        const levelSet = current.levelSet || raw.levelSet === true || isLevel(raw.level);
        const level = current.levelSet ? current.level : isLevel(raw.level) ? raw.level : "uni";
        const earlyStart = raw.earlyStart === true;
        const district = isDistrict(raw.district) ? raw.district : null;
        const buckets = blankBuckets();
        const stored = raw.buckets;
        if (stored && typeof stored === "object") {
          for (const id of ["elem", "mid", "high", "uni"] as const) {
            const bucket = asBucket((stored as Record<string, unknown>)[id]);
            if (bucket) buckets[id] = bucket;
          }
        } else {
          const legacy = asBucket(raw);
          if (legacy) buckets.uni = legacy;
        }
        return {
          ...current,
          lang,
          langSet,
          level,
          levelSet,
          earlyStart,
          district,
          buckets,
        };
      },
    },
  ),
);

// Last language whose content pack was ready; shown while a newly picked pack loads.
let shownLang: Lang = "en";

export function useLang(): Lang {
  const lang = useDesk((state) => state.lang);
  // Re-render once a lazily loaded language pack arrives.
  useSyncExternalStore(subscribeLangPacks, langPackVersion, langPackVersion);
  if (isLangReady(lang)) {
    shownLang = lang;
    return lang;
  }
  return isLangReady(shownLang) ? shownLang : "en";
}

if (typeof window !== "undefined") {
  // Fetch the pack whenever the language changes (picker, import, undo).
  useDesk.subscribe((state, prev) => {
    if (state.lang !== prev.lang) void loadLangPack(state.lang).catch(() => {});
  });
}

/** Language saved under `13th-desk-v1`, read without touching the store. */
function storedLang(): Lang | null {
  try {
    const raw = localStorage.getItem("13th-desk-v1");
    const state = raw ? (JSON.parse(raw) as { state?: { lang?: unknown; langSet?: unknown } }).state : null;
    return state && state.langSet === true && isLang(state.lang) ? state.lang : null;
  } catch {
    return null;
  }
}

/** Snapshot of the fields that are written under `13th-desk-v1`. */
export function getPersistedDeskState(): PersistedDeskLike {
  const state = useDesk.getState();
  return {
    lang: state.lang,
    langSet: state.langSet,
    level: state.level,
    levelSet: state.levelSet,
    earlyStart: state.earlyStart,
    district: state.district,
    buckets: structuredClone(state.buckets),
  };
}

/**
 * Replace the whole persisted desk state in one write.
 * Callers must validate first; this never leaves storage half-written.
 */
export function replacePersistedDeskState(next: PersistedDeskLike): void {
  const payload: PersistedDeskLike = {
    lang: next.lang,
    langSet: next.langSet,
    level: next.level,
    levelSet: next.levelSet,
    earlyStart: next.earlyStart,
    district: next.district,
    buckets: structuredClone(next.buckets),
  };
  useDesk.setState({
    ...payload,
    hydrated: true,
  });
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      "13th-desk-v1",
      JSON.stringify({ state: payload, version: 0 }),
    );
    useStorageStatus.setState({ failed: false });
  } catch {
    useStorageStatus.setState({ failed: true });
  }
}


let hydratePromise: Promise<void> | null = null;

/** Rehydrate once; safe to call from multiple mounts. */
export function ensureDeskHydrated(): Promise<void> {
  if (useDesk.getState().hydrated) return Promise.resolve();
  if (!hydratePromise) {
    hydratePromise = (async () => {
      try {
        // Load the saved language's pack first so the desk never flashes English.
        const saved = typeof window === "undefined" ? null : storedLang();
        if (saved) await loadLangPack(saved).catch(() => {});
        if (!useDesk.persist.hasHydrated()) {
          await useDesk.persist.rehydrate();
        }
      } catch {
        /* broken storage should not blank the desk */
      }
      useDesk.setState({ hydrated: true });
    })();
  }
  return hydratePromise;
}
