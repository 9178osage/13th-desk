import { createContext, useContext, useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist, type StorageValue } from "zustand/middleware";
import { createDeskStorage, type SaveStatus } from "@/lib/desk-storage";
import { DESK_LIMITS, canRestore } from "@/lib/desk-limits";
import { createTabPresence } from "@/lib/tab-presence";
import { isLevel, type Level } from "@/lib/levels";
import { isDistrict, type DistrictId } from "@/data/districts";
import { asStoredCredits, cleanDecimal, isLetter } from "@/lib/gpa";
import {
  isLang,
  isLangReady,
  langPackVersion,
  loadLangPack,
  subscribeLangPacks,
  type Lang,
} from "@/lib/text";
import { validScheduleTime, type ScheduleDraft } from "@/lib/schedule";
import { asHm, emptyBucket, isWeekDay, parseBucket } from "./desk-records.ts";
import type { PersistedDeskLike } from "@/lib/desk-backup";
import {
  EMPTY_PREFS,
  formatPrefsValue,
  prefsCookieString,
  resolveHydratedLevel,
  readPrefsCookie,
  type PrefsHint,
} from "@/lib/prefs-cookie";

/** Chinese-first portal: the language used until a visitor picks one. */
export const DEFAULT_LANG: Lang = "zh";
export const DEFAULT_LEVEL: Level = "uni";

/**
 * Language/level hint from the `eugene-desk-prefs` cookie for this request.
 * The server renders with it; the browser starts from the same cookie, so the
 * first paint and hydration already show the visitor's language and level.
 */
export const DeskHintContext = createContext<PrefsHint>(EMPTY_PREFS);

const bootHint: PrefsHint =
  typeof document === "undefined" ? EMPTY_PREFS : readPrefsCookie(document.cookie);
import type { Bucket, GradeRow, Note, ScheduleBlock, WeekDay } from "./desk-records.ts";

export type { Bucket, GradeRow, Note, ScheduleBlock, WeekDay };

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

const blankBucket = emptyBucket;

function blankBuckets(): Record<Level, Bucket> {
  return { elem: blankBucket(), mid: blankBucket(), high: blankBucket(), uni: blankBucket() };
}

/**
 * A stored bucket, or null when it cannot be loaded without losing data: a field that
 * is present but not an array, or any record that would be dropped (e.g. a grade with
 * 1.25 credits). Missing fields are fine (older saves). Callers turn null into the
 * corrupt-save hold (see `storedDeskIsUsable`), so the original is never overwritten
 * by a silently filtered copy. Always returns the full key set, never a partial bucket.
 */
function asBucket(value: unknown): Bucket | null {
  const { bucket, lossy } = parseBucket(value);
  return lossy ? null : bucket;
}

/**
 * Whether a parsed `{ state, version }` save can be loaded without dropping anything.
 * Valid JSON whose records would be filtered out is treated like a corrupt save:
 * desk-storage holds it (no writes, error notice) until an explicit restore archives it.
 */
export function storedDeskIsUsable(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const state = (value as { state?: unknown }).state;
  if (!state || typeof state !== "object") return false;
  const raw = state as Record<string, unknown>;
  const stored = raw.buckets;
  if (stored === undefined) return asBucket(raw) !== null; // legacy single-bucket save
  if (!stored || typeof stored !== "object") return false;
  for (const id of ["elem", "mid", "high", "uni"] as const) {
    const item = (stored as Record<string, unknown>)[id];
    if (item !== undefined && asBucket(item) === null) return false;
  }
  return true;
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

export const useStorageStatus = create<{ failed: boolean; reason: SaveStatus; otherTabs: boolean }>(
  () => ({
    failed: false,
    reason: "ready",
    otherTabs: false,
  }),
);
const deskStorage =
  typeof window === "undefined"
    ? null
    : createDeskStorage<PersistedDesk>({
        // Access localStorage inside these methods: the getter itself may throw.
        storage: {
          getItem: (key) => localStorage.getItem(key),
          setItem: (key, value) => localStorage.setItem(key, value),
          removeItem: (key) => localStorage.removeItem(key),
        },
        status: (reason) => useStorageStatus.setState({ failed: reason !== "ready", reason }),
        validate: storedDeskIsUsable,
        // A save was merged with a newer save from another tab: show the merged desk.
        merged: (value) => applyStoredDesk(value as StorageValue<PersistedDesk>),
      });

const deskStore = create<DeskState>()(
  persist(
    (set, get) => ({
      lang: bootHint.lang ?? DEFAULT_LANG,
      langSet: false,
      level: bootHint.level ?? DEFAULT_LEVEL,
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
        if (!has && bucket.favs.length >= DESK_LIMITS.favs) return;
        const favs = has ? bucket.favs.filter((item) => item !== id) : [...bucket.favs, id];
        set({ buckets: { ...buckets, [level]: { ...bucket, favs } } });
      },
      addNote: (text) => {
        const clean = text.trim().slice(0, 140);
        const { level, buckets } = get();
        const bucket = buckets[level];
        if (!clean || bucket.notes.length >= DESK_LIMITS.notes) return false;
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
        if (!canRestore(bucket.notes, note.id, "notes")) return false;
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
        if (!has && bucket.checks.length >= DESK_LIMITS.checks) return;
        const checks = has ? bucket.checks.filter((item) => item !== id) : [...bucket.checks, id];
        set({ buckets: { ...buckets, [level]: { ...bucket, checks } } });
      },
      addGrade: (row) => {
        const credits = asStoredCredits(row.credits);
        if (!isLetter(row.grade) || credits == null) return;
        const { level, buckets } = get();
        const bucket = buckets[level];
        if (bucket.grades.length >= DESK_LIMITS.grades) return;
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
        if (bucket.schedule.length >= DESK_LIMITS.schedule) return false;
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
        if (!canRestore(bucket.schedule, row.id, "schedule")) return false;
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
      storage: deskStorage?.storage ?? {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
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
        const levelSet =
          current.levelSet ||
          raw.levelSet === true ||
          (typeof raw.levelSet !== "boolean" && isLevel(raw.level));
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

const hintedStates = new Map<string, DeskState>();

/** Initial desk state with the request's cookie hint applied (cached per hint). */
function hintedInitialState(hint: PrefsHint): DeskState {
  const key = `${hint.lang ?? ""}.${hint.level ?? ""}`;
  let state = hintedStates.get(key);
  if (!state) {
    const base = deskStore.getInitialState();
    state = { ...base, lang: hint.lang ?? base.lang, level: hint.level ?? base.level };
    hintedStates.set(key, state);
  }
  return state;
}

function useDeskSelector<T>(selector: (state: DeskState) => T): T {
  const hint = useContext(DeskHintContext);
  return useSyncExternalStore(
    deskStore.subscribe,
    () => selector(deskStore.getState()),
    // Server render and hydration read the hinted initial state; the server
    // store itself is shared by every request and is never mutated.
    () => selector(hintedInitialState(hint)),
  );
}

export const useDesk = Object.assign(useDeskSelector, {
  getState: deskStore.getState,
  setState: deskStore.setState,
  subscribe: deskStore.subscribe,
  getInitialState: deskStore.getInitialState,
  persist: deskStore.persist,
});

/** Mirror the explicit language/level choice into the prefs cookie (or clear it). */
function syncPrefsCookie(state: Pick<DeskState, "lang" | "langSet" | "level" | "levelSet">) {
  try {
    document.cookie = prefsCookieString(formatPrefsValue(state), location.protocol === "https:");
  } catch {
    /* cookies blocked: the server simply renders the defaults */
  }
}

// Last language whose content pack was ready; shown while a newly picked pack loads.
let shownLang: Lang = DEFAULT_LANG;

export function useLang(): Lang {
  const lang = useDesk((state) => state.lang);
  // Re-render once a lazily loaded language pack arrives.
  useSyncExternalStore(subscribeLangPacks, langPackVersion, langPackVersion);
  if (isLangReady(lang)) {
    // Module state is shared across SSR requests: only remember it in the browser.
    if (typeof window !== "undefined") shownLang = lang;
    return lang;
  }
  // On the server, do not fall back through module state: it belongs to whichever
  // request ran last, so a shared worker could render this visitor's page in the
  // previous visitor's language. The defaults are the only request-independent answer.
  if (typeof window === "undefined") return DEFAULT_LANG;
  return isLangReady(shownLang) ? shownLang : DEFAULT_LANG;
}

if (typeof window !== "undefined") {
  deskStore.subscribe((state, prev) => {
    // Fetch the pack whenever the language changes (picker, import, undo).
    if (state.lang !== prev.lang) void loadLangPack(state.lang).catch(() => {});
    // Keep the server hint in step with localStorage once the desk is loaded.
    if (
      state.hydrated &&
      (state.hydrated !== prev.hydrated ||
        state.lang !== prev.lang ||
        state.langSet !== prev.langSet ||
        state.level !== prev.level ||
        state.levelSet !== prev.levelSet)
    ) {
      syncPrefsCookie(state);
    }
  });
}

/**
 * Another tab saved the desk: load its version here (stored values win, including
 * language and level) so this tab's next save does not overwrite newer data.
 */
function syncFromOtherTab(raw: string | null) {
  if (!deskStorage || !useDesk.getState().hydrated) return;
  deskStorage.syncFrom(raw, applyStoredDesk);
}

/** Load a saved desk value into memory (stored values win, including language and level). */
function applyStoredDesk(value: StorageValue<PersistedDesk>) {
  if (value.version !== 0) return;
  const merge = useDesk.persist.getOptions().merge;
  if (!merge) return;
  const current = useDesk.getState();
  useDesk.setState(merge(value.state, { ...current, langSet: false, levelSet: false }));
}

if (typeof window !== "undefined") {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== "13th-desk-v1") return;
    try {
      if (event.storageArea !== localStorage) return;
    } catch {
      return;
    }
    syncFromOtherTab(event.newValue);
  };
  window.addEventListener("storage", onStorage);

  let presence: ReturnType<typeof createTabPresence> | null = null;
  try {
    presence = createTabPresence({
      id:
        globalThis.crypto?.randomUUID?.() ??
        `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`,
      channel:
        typeof BroadcastChannel === "function" ? new BroadcastChannel("13th-desk-v1:tabs") : null,
      locks:
        typeof navigator !== "undefined" &&
        navigator.locks &&
        typeof navigator.locks.query === "function"
          ? navigator.locks
          : null,
      setInterval: (fn, ms) => window.setInterval(fn, ms),
      clearInterval: (handle) => window.clearInterval(handle as number),
      onChange: (otherTabs) => useStorageStatus.setState({ otherTabs }),
    });
  } catch {
    presence = null;
  }
  const onPageHide = () => presence?.leave();
  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted) presence?.wake();
  };
  const onVisible = () => {
    if (document.visibilityState === "visible") presence?.wake();
  };
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("pageshow", onPageShow);
  document.addEventListener("visibilitychange", onVisible);
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
      presence?.dispose();
    });
  }
}

/** Language saved under `13th-desk-v1`, read without touching the store. */
function storedLang(): Lang | null {
  try {
    const raw = localStorage.getItem("13th-desk-v1");
    const state = raw
      ? (JSON.parse(raw) as { state?: { lang?: unknown; langSet?: unknown } }).state
      : null;
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
export async function replacePersistedDeskState(next: PersistedDeskLike): Promise<boolean> {
  const payload: PersistedDeskLike = {
    lang: next.lang,
    langSet: next.langSet,
    level: next.level,
    levelSet: next.levelSet,
    earlyStart: next.earlyStart,
    district: next.district,
    buckets: structuredClone(next.buckets),
  };
  if (!deskStorage || !(await deskStorage.replace({ state: payload, version: 0 }))) return false;
  useDesk.setState({
    ...payload,
    hydrated: true,
  });
  return true;
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
      // localStorage is the source of truth; an unsaved language falls back to
      // the default, but an unsaved level adopts a valid cookie level (the same
      // one the server rendered) instead of jumping to the default.
      const loaded = useDesk.getState();
      const level = resolveHydratedLevel(
        loaded,
        typeof document === "undefined" ? EMPTY_PREFS : readPrefsCookie(document.cookie),
        DEFAULT_LEVEL,
      );
      useDesk.setState({
        hydrated: true,
        ...(loaded.langSet ? {} : { lang: DEFAULT_LANG }),
        ...(loaded.levelSet ? {} : (level as Pick<DeskState, "level" | "levelSet">)),
      });
    })();
  }
  return hydratePromise;
}
