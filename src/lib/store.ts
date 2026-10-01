import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isLevel, type Level } from "@/lib/levels";
import { isDistrict, type DistrictId } from "@/data/districts";
import { asStoredCredits, cleanDecimal, isLetter, type Letter } from "@/lib/gpa";
import { isLang, type Lang } from "@/lib/text";

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

export type Bucket = {
  favs: string[];
  notes: Note[];
  checks: string[];
  grades: GradeRow[];
  priorGpa: string;
  priorWeighted: string;
  priorCredits: string;
};

type DeskState = {
  lang: Lang;
  langSet: boolean;
  level: Level;
  buckets: Record<Level, Bucket>;
  hydrated: boolean;
  earlyStart: boolean;
  district: DistrictId | null;
  setLang: (lang: Lang) => void;
  setLevel: (level: Level) => void;
  setEarlyStart: (on: boolean) => void;
  setDistrict: (id: DistrictId | null) => void;
  toggleFav: (id: string) => void;
  addNote: (text: string) => void;
  toggleNote: (id: string) => void;
  removeNote: (id: string) => void;
  toggleCheck: (id: string) => void;
  addGrade: (row: { title: string; credits: number; grade: string; boost: boolean }) => void;
  removeGrade: (id: string) => void;
  clearGrades: () => void;
  setGpaPrior: (patch: { gpa?: string; weighted?: string; credits?: string }) => void;
};

function blankBucket(): Bucket {
  return {
    favs: [],
    notes: [],
    checks: [],
    grades: [],
    priorGpa: "",
    priorWeighted: "",
    priorCredits: "",
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

function asBucket(value: unknown): Bucket | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const notes = Array.isArray(raw.notes)
    ? raw.notes.map(asNote).filter((item): item is Note => item !== null).slice(0, 20)
    : [];
  const favs = Array.isArray(raw.favs)
    ? raw.favs.filter((item): item is string => typeof item === "string").slice(0, 80)
    : [];
  const checks = Array.isArray(raw.checks)
    ? raw.checks.filter((item): item is string => typeof item === "string").slice(0, 40)
    : [];
  const grades = Array.isArray(raw.grades)
    ? raw.grades.map(asGrade).filter((item): item is GradeRow => item !== null).slice(0, 40)
    : [];
  return {
    favs,
    notes,
    checks,
    grades,
    priorGpa: cleanDecimal(raw.priorGpa, 4),
    priorWeighted: cleanDecimal(raw.priorWeighted, 4),
    priorCredits: cleanDecimal(raw.priorCredits, 6),
  };
}

export const useDesk = create<DeskState>()(
  persist(
    (set, get) => ({
      lang: "en",
      langSet: false,
      level: "uni",
      buckets: blankBuckets(),
      hydrated: false,
      earlyStart: false,
      district: null,
      setLang: (lang) => {
        if (!isLang(lang)) return;
        set({ lang, langSet: true });
      },
      setLevel: (level) => {
        if (!isLevel(level)) return;
        set({ level });
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
        if (!clean || bucket.notes.length >= 20) return;
        set({
          buckets: {
            ...buckets,
            [level]: {
              ...bucket,
              notes: [{ id: crypto.randomUUID(), text: clean, done: false }, ...bucket.notes],
            },
          },
        });
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
                patch.weighted === undefined ? bucket.priorWeighted : cleanDecimal(patch.weighted, 4),
              priorCredits:
                patch.credits === undefined ? bucket.priorCredits : cleanDecimal(patch.credits, 6),
            },
          },
        });
      },
    }),
    {
      name: "13th-desk-v1",
      skipHydration: true,
      partialize: (state) => ({
        lang: state.lang,
        langSet: state.langSet,
        level: state.level,
        earlyStart: state.earlyStart,
        district: state.district,
        buckets: state.buckets,
      }),
      merge: (persisted, current) => {
        if (!persisted || typeof persisted !== "object") return current;
        const raw = persisted as Record<string, unknown>;
        const langSet = raw.langSet === true;
        const lang = langSet && isLang(raw.lang) ? raw.lang : "en";
        const level = isLevel(raw.level) ? raw.level : "uni";
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
        return { ...current, lang, langSet, level, earlyStart, district, buckets };
      },
    },
  ),
);

export function useLang(): Lang {
  return useDesk((state) => state.lang);
}
