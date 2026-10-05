import { test } from "node:test";
import assert from "node:assert/strict";
import {
  conflictingClassIds,
  hasScheduleOverlap,
  nextClass,
  overlappingClasses,
  scheduleForDay,
  validScheduleTime,
} from "./schedule.ts";
import { cleanDecimal, combinedGpa, listGpa, parseGpaInput, pointsTenths } from "./gpa.ts";
import { deskText, dayName } from "./desk-copy.ts";
import {
  backupFileName,
  beforeImportFileName,
  DESK_PRE_IMPORT_KEY,
  importUndoOffered,
  parseDeskBackup,
  serializeDeskBackup,
  summarizeDeskState,
  writePreImportSnapshot,
  readPreImportSnapshot,
  clearPreImportSnapshot,
  type PersistedDeskLike,
} from "./desk-backup.ts";
import {
  k12CalendarSourceMeta,
  k12HasStoredDates,
  termExpiredByValidThrough,
  UO_VALID_THROUGH,
} from "./calendar-meta.ts";
import { releaseLine } from "../data/k12.ts";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import esPack from "./i18n/es.json" with { type: "json" };
import koPack from "./i18n/ko.json" with { type: "json" };
import viPack from "./i18n/vi.json" with { type: "json" };
import jaPack from "./i18n/ja.json" with { type: "json" };
import type { ScheduleBlock } from "./store";

const schedule: ScheduleBlock[] = [
  {
    id: "later",
    day: "mon",
    start: "13:00",
    end: "14:00",
    title: "Math",
    place: "",
    pinned: false,
  },
  {
    id: "early",
    day: "mon",
    start: "09:00",
    end: "10:00",
    title: "Writing",
    place: "",
    pinned: true,
  },
  {
    id: "other",
    day: "tue",
    start: "08:00",
    end: "09:00",
    title: "Science",
    place: "",
    pinned: false,
  },
];

test("schedule rejects equal, reversed and malformed times", () => {
  for (const [start, end] of [
    ["10:00", "09:00"],
    ["10:00", "10:00"],
    ["25:00", "26:00"],
    ["09:99", "10:00"],
    ["", "10:00"],
  ]) {
    assert.equal(validScheduleTime(start, end), false);
  }
  assert.equal(validScheduleTime("00:00", "23:59"), true);
});
test("daily ordering never mutates persisted data", () => {
  assert.deepEqual(
    scheduleForDay(schedule, "mon").map((row) => row.id),
    ["early", "later"],
  );
  assert.equal(schedule[0].id, "later");
});
test("next class includes ongoing lessons and excludes ended lessons", () => {
  assert.equal(nextClass(schedule, "mon", 480)?.id, "early");
  assert.equal(nextClass(schedule, "mon", 550)?.id, "early");
  assert.equal(nextClass(schedule, "mon", 600)?.id, "later");
  assert.equal(nextClass(schedule, "mon", 840), null);
});
test("weekends and empty schedules do not invent a next class", () => {
  assert.equal(nextClass(schedule, null, 600), null);
  assert.equal(nextClass([], "mon", 600), null);
});
test("invalid legacy classes stay editable but never become the next class", () => {
  const old = { ...schedule[0], start: "15:00", end: "14:00" };
  assert.equal(nextClass([old], "mon", 600), null);
  assert.equal(scheduleForDay([old], "mon").length, 1);
});
test("overlap warning excludes edited row and adjacent lessons", () => {
  assert.equal(
    hasScheduleOverlap(schedule, { ...schedule[1], start: "09:30", end: "10:30" }),
    true,
  );
  assert.equal(
    hasScheduleOverlap(schedule, { ...schedule[1], start: "10:00", end: "11:00" }),
    false,
  );
  assert.equal(hasScheduleOverlap(schedule, schedule[1], "early"), false);
  assert.equal(hasScheduleOverlap(schedule, { ...schedule[1], day: "fri" }), false);
});
test("GPA validates the selected scale", () => {
  assert.equal(parseGpaInput("4.30", 430), 430);
  assert.equal(parseGpaInput("4.31", 430), null);
  assert.equal(parseGpaInput("4.01", 400), null);
  assert.equal(parseGpaInput("5.00", 500), 500);
  assert.equal(parseGpaInput("5.01", 500), null);
});
test("invalid decimal input is not silently converted to a different number", () => {
  assert.equal(parseGpaInput(cleanDecimal("-3", 4)), null);
  assert.equal(parseGpaInput(cleanDecimal("1e3", 4)), null);
  assert.equal(parseGpaInput(cleanDecimal("3..5", 4)), null);
});
test("GPA weights by credits and counts F as zero", () => {
  const result = listGpa(
    "uni",
    [
      { grade: "A", credits: 4, boost: false },
      { grade: "F", credits: 2, boost: false },
    ],
    false,
  );
  assert.deepEqual(result, { gpaHundredths: 267, creditHundredths: 600 });
});
test("high school boost never turns a failing grade into a passing one", () => {
  assert.equal(pointsTenths("high", { grade: "A", credits: 1, boost: true }, true), 50);
  assert.equal(pointsTenths("high", { grade: "F", credits: 1, boost: true }, true), 0);
});
test("prior GPA works without new courses and combines exactly", () => {
  assert.deepEqual(combinedGpa("uni", [], false, 350, 1600), {
    gpaHundredths: 350,
    creditHundredths: 1600,
  });
  assert.deepEqual(
    combinedGpa("uni", [{ grade: "A", credits: 4, boost: false }], false, 350, 1600),
    { gpaHundredths: 360, creditHundredths: 2000 },
  );
});
test("new controls and weekday names exist in all six languages", () => {
  for (const lang of ["en", "zh", "es", "ko", "vi", "ja"] as const) {
    assert.ok(deskText(lang, "save").length > 0);
    assert.ok(dayName(lang, "mon").length > 0);
    assert.ok(deskText(lang, "results", { n: 3 }).includes("3"));
    assert.ok(deskText(lang, "exportData").length > 0);
    assert.ok(deskText(lang, "saveAnyway").length > 0);
    assert.ok(deskText(lang, "dismissUndo").length > 0);
    assert.ok(deskText(lang, "importPreview", { notes: 1, classes: 2, grades: 3 }).length > 0);
  }
});
test("overlap detection lists conflicting classes and ignores adjacent times", () => {
  const hits = overlappingClasses(schedule, {
    day: "mon",
    title: "Lab",
    place: "",
    start: "09:30",
    end: "10:30",
  });
  assert.deepEqual(
    hits.map((row) => row.id),
    ["early"],
  );
  assert.equal(
    overlappingClasses(schedule, {
      day: "mon",
      title: "Break",
      place: "",
      start: "10:00",
      end: "11:00",
    }).length,
    0,
  );
  assert.equal(
    overlappingClasses(schedule, schedule[1], "early").length,
    0,
  );
});
test("existing overlapping courses are marked as conflicts", () => {
  const crowded: ScheduleBlock[] = [
    ...schedule,
    {
      id: "clash",
      day: "mon",
      start: "09:30",
      end: "10:30",
      title: "Lab",
      place: "",
      pinned: false,
    },
  ];
  const ids = conflictingClassIds(crowded);
  assert.equal(ids.has("early"), true);
  assert.equal(ids.has("clash"), true);
  assert.equal(ids.has("later"), false);
  assert.equal(ids.has("other"), false);
  assert.equal(conflictingClassIds(schedule).size, 0);
});

function blankBucket() {
  return {
    favs: [] as string[],
    notes: [] as { id: string; text: string; done: boolean }[],
    checks: [] as string[],
    grades: [] as {
      id: string;
      title: string;
      credits: number;
      grade: "A" | "B" | "C" | "D" | "F";
      boost: boolean;
    }[],
    priorGpa: "",
    priorWeighted: "",
    priorCredits: "",
    schedule: [] as ScheduleBlock[],
  };
}

function sampleState(): PersistedDeskLike {
  const buckets = {
    elem: blankBucket(),
    mid: blankBucket(),
    high: blankBucket(),
    uni: blankBucket(),
  };
  buckets.uni.notes = [{ id: "n1", text: "Review notes", done: false }];
  buckets.uni.schedule = [
    {
      id: "c1",
      day: "mon",
      start: "09:00",
      end: "10:00",
      title: "Writing",
      place: "PLC",
      pinned: false,
    },
  ];
  buckets.uni.grades = [
    { id: "g1", title: "Chem", credits: 4, grade: "A", boost: false },
  ];
  return {
    lang: "zh",
    langSet: true,
    level: "uni",
    levelSet: true,
    earlyStart: false,
    district: null,
    buckets,
  };
}

test("desk backup serializes and parses a round trip", () => {
  const state = sampleState();
  const file = serializeDeskBackup(state, "2026-10-05T12:00:00.000Z");
  assert.equal(file.app, "Eugene Desk");
  assert.equal(file.formatVersion, 1);
  assert.equal(file.storageKey, "13th-desk-v1");
  assert.match(backupFileName(new Date("2026-10-05T12:00:00Z")), /eugene-desk-backup-2026-10-05\.json/);
  const parsed = parseDeskBackup(JSON.stringify(file));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.deepEqual(parsed.backup.state, state);
  assert.equal(parsed.summary.totalNotes, 1);
  assert.equal(parsed.summary.totalClasses, 1);
  assert.equal(parsed.summary.totalGrades, 1);
  assert.equal(summarizeDeskState(state).stages.uni.notes, 1);
});

test("desk backup rejects wrong version and corrupted JSON", () => {
  const broken = parseDeskBackup("{not-json");
  assert.equal(broken.ok, false);
  if (!broken.ok) assert.equal(broken.error, "json");
  const base = serializeDeskBackup(sampleState());
  const wrongVersion = { ...base, formatVersion: 99 };
  const badVersion = parseDeskBackup(JSON.stringify(wrongVersion));
  assert.equal(badVersion.ok, false);
  if (!badVersion.ok) assert.equal(badVersion.error, "version");
  const garbled = parseDeskBackup(JSON.stringify({ hello: "world" }));
  assert.equal(garbled.ok, false);
  if (!garbled.ok) assert.equal(garbled.error, "shape");
});

test("desk backup rejects bad times and missing stages", () => {
  const state = sampleState();
  state.buckets.uni.schedule[0] = {
    ...state.buckets.uni.schedule[0],
    start: "10:00",
    end: "09:00",
  };
  const badTime = parseDeskBackup(JSON.stringify(serializeDeskBackup(state)));
  assert.equal(badTime.ok, false);
  if (!badTime.ok) assert.equal(badTime.error, "times");

  const missing = serializeDeskBackup(sampleState());
  delete (missing.state.buckets as { mid?: unknown }).mid;
  const badStages = parseDeskBackup(JSON.stringify(missing));
  assert.equal(badStages.ok, false);
  if (!badStages.ok) assert.equal(badStages.error, "stages");
});

test("import undo stays offered after other status messages", () => {
  assert.equal(importUndoOffered(true), true);
  assert.equal(importUndoOffered(false), false);
});

test("term expiry uses valid-through without inventing new dates", () => {
  assert.equal(termExpiredByValidThrough("2026-12-11", UO_VALID_THROUGH), false);
  assert.equal(termExpiredByValidThrough("2026-12-12", UO_VALID_THROUGH), true);
});

test("only 4J (or unset) has stored K12 calendar rows", () => {
  assert.equal(k12HasStoredDates(null), true);
  assert.equal(k12HasStoredDates("4j"), true);
  assert.equal(k12HasStoredDates("bethel"), false);
  assert.equal(k12HasStoredDates("springfield"), false);
});

test("k12 calendar source follows district without inventing other-district dates", () => {
  const fourJ = k12CalendarSourceMeta("4j");
  assert.equal(fourJ.hasMatchingData, true);
  assert.equal(fourJ.name.en, "Eugene 4J");
  assert.equal(fourJ.name.zh, "尤金 4J");
  assert.match(fourJ.href ?? "", /4j\.lane\.edu/);

  const bethel = k12CalendarSourceMeta("bethel");
  assert.equal(bethel.hasMatchingData, false);
  assert.equal(bethel.name.zh, "参考校历");
  assert.equal(bethel.name.en, "Reference calendar");
  assert.equal(bethel.name.es, "Calendario de referencia");
  assert.equal(bethel.name.ko, "참고 학사일정");
  assert.equal(bethel.name.vi, "Lịch tham khảo");
  assert.equal(bethel.name.ja, "参考カレンダー");
  assert.equal(bethel.href, "https://www.bethel.k12.or.us/");
  assert.notEqual(bethel.href, fourJ.href);
});

test("before-import backup filename includes date and time", () => {
  assert.match(
    beforeImportFileName(new Date("2026-10-05T15:04:00")),
    /eugene-desk-before-import-2026-10-05-1504\.json/,
  );
});

test("pre-import snapshot round-trips under a separate storage key", () => {
  const memory = new Map();
  const storage = {
    getItem: (k: string) => (memory.has(k) ? memory.get(k) : null),
    setItem: (k: string, v: string) => {
      memory.set(k, String(v));
    },
    removeItem: (k: string) => {
      memory.delete(k);
    },
    clear: () => memory.clear(),
    key: (i: number) => [...memory.keys()][i] ?? null,
    get length() {
      return memory.size;
    },
  } as Storage;
  globalThis.localStorage = storage;
  // @ts-expect-error test shim for window
  globalThis.window = globalThis;
  const state = sampleState();
  assert.equal(writePreImportSnapshot(state), true);
  assert.ok(memory.has(DESK_PRE_IMPORT_KEY));
  assert.deepEqual(readPreImportSnapshot(), state);
  clearPreImportSnapshot();
  assert.equal(readPreImportSnapshot(), null);
});


test("content Copy strings have es/ko/vi/ja via pack or inline", () => {
  const packs: Record<"es" | "ko" | "vi" | "ja", Record<string, string>> = {
    es: esPack as Record<string, string>,
    ko: koPack as Record<string, string>,
    vi: viPack as Record<string, string>,
    ja: jaPack as Record<string, string>,
  };
  const langs = ["es", "ko", "vi", "ja"] as const;
  type Copy = { en: string; zh?: string; es?: string; ko?: string; vi?: string; ja?: string };
  const found = new Map<string, Copy>();

  function add(copy: Copy) {
    if (!copy.en) return;
    const prev = found.get(copy.en) ?? { en: copy.en };
    found.set(copy.en, {
      ...prev,
      ...Object.fromEntries(
        (["zh", ...langs] as const)
          .filter((k) => copy[k] && !prev[k])
          .map((k) => [k, copy[k]]),
      ),
      zh: copy.zh ?? prev.zh,
    });
  }

  function walkFiles(dir: string, acc: string[] = []) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        if (name === "node_modules" || name === "i18n") continue;
        walkFiles(p, acc);
      } else if (/\.(tsx|ts)$/.test(name) && !name.includes(".test.") && !p.endsWith("desk-copy.ts")) {
        acc.push(p);
      }
    }
    return acc;
  }

  function unescape(s: string) {
    try {
      return JSON.parse(`"${s}"`);
    } catch {
      return s;
    }
  }

  const root = join(import.meta.dirname, "..");
  for (const file of walkFiles(root)) {
    const text = readFileSync(file, "utf8");
    const re = /\ben:\s*"((?:\\.|[^"\\])*)"\s*,\s*zh:\s*"((?:\\.|[^"\\])*)"/gs;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const en = unescape(m[1]);
      const zh = unescape(m[2]);
      const window = text.slice(m.index, Math.min(text.length, m.index + 1200));
      const endRel = window.search(/\n\s*\}/);
      const obj = endRel >= 0 ? window.slice(0, endRel + 1) : window.slice(0, 400);
      const copy: Copy = { en, zh };
      for (const lang of langs) {
        const km = obj.match(new RegExp(`\\b${lang}:\\s*"((?:\\\\.|[^"\\\\])*)"`));
        if (km) copy[lang] = unescape(km[1]);
      }
      add(copy);
    }
  }

  const gaps: string[] = [];
  for (const [en, copy] of found) {
    for (const lang of langs) {
      if (!(copy[lang] || packs[lang][en])) gaps.push(`${lang}: ${en.slice(0, 80)}`);
    }
  }
  assert.equal(gaps.length, 0, gaps.slice(0, 12).join("\n"));
});

test("K12 releaseLine is available in all six languages", () => {
  for (const level of ["elem", "mid", "high"] as const) {
    for (const wednesday of [false, true]) {
      const copy = releaseLine(level, wednesday);
      for (const lang of ["en", "zh", "es", "ko", "vi", "ja"] as const) {
        assert.equal(typeof copy[lang], "string", `${level} wed=${wednesday} missing ${lang}`);
        assert.ok((copy[lang] ?? "").length > 0, `${level} wed=${wednesday} empty ${lang}`);
      }
    }
  }
});
