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
import { cleanDecimal, combinedGpa, listGpa, parseGpaInput, pointsTenths, targetGpaEstimate } from "./gpa.ts";
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
import { deskBootScript, BOOT_HTML_LANG } from "./boot-script.ts";
import {
  PREFS_COOKIE,
  formatPrefsValue,
  parsePrefsValue,
  prefsCookieString,
  readPrefsCookie,
  resolveHydratedLevel,
} from "./prefs-cookie.ts";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import esPack from "./i18n/es.json" with { type: "json" };
import koPack from "./i18n/ko.json" with { type: "json" };
import viPack from "./i18n/vi.json" with { type: "json" };
import jaPack from "./i18n/ja.json" with { type: "json" };
import type { ScheduleBlock } from "./store";
import { places } from "../data/places.ts";
import { PLACE_HOURS, placeHours } from "../data/place-hours.ts";
import { htmlLang } from "./text.ts";

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

test("desk backup rejects duplicate IDs in every record list and stage", () => {
  for (const stage of ["elem", "mid", "high", "uni"] as const) {
    for (const list of ["notes", "schedule", "grades"] as const) {
      const state = sampleState();
      const row = state.buckets.uni[list][0];
      Object.assign(state.buckets[stage], { [list]: [row, { ...row }] });
      assert.equal(parseDeskBackup(JSON.stringify(serializeDeskBackup(state))).ok, false, `${stage}.${list}`);
    }
  }
});
test("the same record ID in separate stages is valid", () => {
  const state = sampleState();
  state.buckets.high.notes = [...state.buckets.uni.notes];
  assert.equal(parseDeskBackup(JSON.stringify(serializeDeskBackup(state))).ok, true);
});
test("every place-hours hint has six translations and no silent English fallback", () => {
  for (const place of places) {
    if (!place.hours) continue;
    assert.ok(PLACE_HOURS[place.hours], place.hours);
    for (const lang of ["en", "zh", "es", "ko", "vi", "ja"] as const) {
      assert.ok(PLACE_HOURS[place.hours][lang].trim(), `${place.id}.${lang}`);
      if (lang !== "en") assert.notEqual(placeHours(lang, place.hours), place.hours);
    }
  }
});
test("save and recovery notices are available in all six languages", () => {
  for (const key of [
    "storageError",
    "storageOverflow",
    "otherTabOpen",
    "dismissNotice",
    "importSaveFailed",
    "classSaved",
    "classLimit",
    "classGone",
  ] as const) {
    for (const lang of ["en", "zh", "es", "ko", "vi", "ja"] as const) assert.ok(deskText(lang, key));
  }
});
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

function runBoot(stored: string | null, throws = false, userAgent = "") {
  const attrs: Record<string, string> = {};
  const root = {
    lang: "zh-CN",
    setAttribute(name: string, value: string) {
      attrs[name] = value;
    },
  };
  const localStorage = {
    getItem(key: string) {
      if (throws) throw new Error("blocked");
      return key === "13th-desk-v1" ? stored : null;
    },
  };
  new Function("localStorage", "document", "navigator", deskBootScript)(
    localStorage,
    { documentElement: root },
    { userAgent },
  );
  lastBootAttrs = attrs;
  return { lang: root.lang, setup: attrs["data-desk-setup"] ?? null };
}
let lastBootAttrs: Record<string, string> = {};

test("boot script sets <html lang> and setup flag from saved desk only", () => {
  const saved = (state: Record<string, unknown>) => JSON.stringify({ state, version: 0 });
  assert.deepEqual(runBoot(null), { lang: "zh-CN", setup: null });
  assert.deepEqual(runBoot(saved({ lang: "es", langSet: true, level: "high", levelSet: true })), {
    lang: "es",
    setup: "done",
  });
  // Legacy saves without levelSet still count when the level itself is valid.
  assert.deepEqual(runBoot(saved({ lang: "ja", langSet: true, level: "uni" })), {
    lang: "ja",
    setup: "done",
  });
  // Never picked a language: keep the default and keep showing the setup note.
  assert.deepEqual(runBoot(saved({ lang: "en", langSet: false, level: "uni", levelSet: true })), {
    lang: "zh-CN",
    setup: null,
  });
  assert.deepEqual(runBoot(saved({ lang: "xx", langSet: true, level: "uni" })), {
    lang: "zh-CN",
    setup: null,
  });
  // Picked a language but never a level: the default "uni" must not count as chosen.
  assert.deepEqual(runBoot(saved({ lang: "es", langSet: true, level: "uni", levelSet: false })), {
    lang: "es",
    setup: null,
  });
  assert.deepEqual(runBoot("{not json"), { lang: "zh-CN", setup: null });
  assert.deepEqual(runBoot("null"), { lang: "zh-CN", setup: null });
  assert.deepEqual(runBoot(null, true), { lang: "zh-CN", setup: null });
});

test("boot script trims Apple/Windows font names only on Android, Linux and ChromeOS", () => {
  const lean = (ua: string, stored: string | null = null) => {
    runBoot(stored, false, ua);
    return lastBootAttrs["data-desk-fonts"] ?? null;
  };
  const android =
    "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";
  assert.equal(lean(android), "lean");
  assert.equal(lean("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/129.0 Safari/537.36"), "lean");
  assert.equal(lean("Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 Chrome/129.0"), "lean");
  // Saved desks and the setup flag still work alongside it.
  assert.equal(lean(android, JSON.stringify({ state: { lang: "es", langSet: true, level: "high" } })), "lean");
  assert.equal(lastBootAttrs["data-desk-setup"], "done");
  for (const ua of [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/129.0 Safari/537.36",
    "",
  ]) {
    assert.equal(lean(ua), null, ua);
  }
  // The CSS override keeps the exact fallback order minus the Apple/Windows names.
  const css = readFileSync(join(import.meta.dirname, "..", "styles.css"), "utf8");
  const block = css.match(/html\[data-desk-fonts="lean"\]\s*\{([^}]*)\}/);
  assert.ok(block, "lean font override missing");
  assert.match(block[1], /--font-sans:\s*"Outfit",\s*system-ui,\s*sans-serif;/);
  assert.match(block[1], /--font-display:\s*"Fraunces",\s*serif;/);
  assert.match(css, /--font-sans:\s*"Outfit",\s*"PingFang SC",\s*"Hiragino Sans",\s*"Malgun Gothic",\s*system-ui,\s*sans-serif;/);
});

test("Vietnamese weekdays are pinned so server HTML matches the browser", () => {
  assert.deepEqual(
    ["mon", "tue", "wed", "thu", "fri"].map((d) => dayName("vi", d)),
    ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"],
  );
  const time = readFileSync(join(import.meta.dirname, "time.ts"), "utf8");
  assert.match(time, /VI_SHORT_WEEKDAYS\[/);
  assert.match(time, /lang !== "vi" \|\| options\.weekday !== "short"/);
});

test("first-screen font faces are preloaded", () => {
  const root = readFileSync(join(import.meta.dirname, "..", "routes/__root.tsx"), "utf8");
  for (const face of ["outfit-latin-400", "outfit-latin-500", "fraunces-latin-500", "fraunces-latin-600"]) {
    assert.ok(root.includes(`${face}-normal.woff2?url`), `${face} not preloaded`);
  }
  assert.match(root, /\.\.\.FONT_PRELOADS/);
});

test("Today section kickers exist in all six languages", () => {
  for (const key of ["eyebrowTasks", "eyebrowWeek", "eyebrowAround", "eyebrowCalendar"] as const) {
    const seen = new Set<string>();
    for (const lang of ["en", "zh", "es", "ko", "vi", "ja"] as const) {
      const text = deskText(lang, key);
      assert.ok(text.trim().length > 0, `${key} empty for ${lang}`);
      seen.add(text);
    }
    assert.ok(seen.size >= 5, `${key} looks untranslated`);
  }
});

test("bundle guards: language packs and Recharts stay code-split", () => {
  const src = join(import.meta.dirname, "..");
  const text = readFileSync(join(src, "lib/text.ts"), "utf8");
  assert.doesNotMatch(text, /^import\s+\w+\s+from\s+["'][^"']*i18n\//m, "text.ts must not statically import packs");
  for (const lang of ["es", "ko", "vi", "ja"]) {
    assert.match(text, new RegExp(`import\\(["']\\./i18n/${lang}\\.json["']\\)`), `${lang} pack is lazy`);
  }
  const rechartsUsers: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(tsx|ts)$/.test(name) && /from\s+["']recharts["']/.test(readFileSync(p, "utf8"))) {
        rechartsUsers.push(p.slice(src.length + 1));
      }
    }
  };
  walk(src);
  assert.deepEqual(rechartsUsers, ["components/gpa-chart.tsx"]);
  const gpa = readFileSync(join(src, "routes/gpa.tsx"), "utf8");
  assert.match(gpa, /lazy\(\(\) => import\("@\/components\/gpa-chart"\)\)/);
});

test("a never-chosen language falls back to the Chinese-first default, not English", () => {
  const store = readFileSync(join(import.meta.dirname, "store.ts"), "utf8");
  assert.match(store, /export const DEFAULT_LANG: Lang = "zh";/);
  const merge = store.slice(store.indexOf("merge: (persisted, current)"));
  assert.match(merge, /langSet && isLang\(raw\.lang\)\s*\?\s*raw\.lang\s*:\s*DEFAULT_LANG/);
  assert.doesNotMatch(merge.slice(0, 900), /raw\.lang\s*:\s*"en"/);
  // levelSet: false with the default level must stay unset (only legacy saves fall back).
  assert.match(merge, /typeof raw\.levelSet !== "boolean" && isLevel\(raw\.level\)/);
});

test("prefs cookie mirrors only explicit language/level choices", () => {
  assert.equal(PREFS_COOKIE, "eugene-desk-prefs");
  assert.equal(formatPrefsValue({ lang: "es", langSet: true, level: "high", levelSet: true }), "es.high");
  assert.equal(formatPrefsValue({ lang: "ja", langSet: true, level: "uni", levelSet: false }), "ja.-");
  assert.equal(formatPrefsValue({ lang: "zh", langSet: false, level: "mid", levelSet: true }), "-.mid");
  // Nothing chosen (or junk): clear the cookie rather than store defaults.
  assert.equal(formatPrefsValue({ lang: "zh", langSet: false, level: "uni", levelSet: false }), null);
  assert.equal(formatPrefsValue({ lang: "xx", langSet: true, level: "nope", levelSet: true }), null);
});

test("prefs cookie parsing never trusts unexpected values", () => {
  assert.deepEqual(parsePrefsValue("es.high"), { lang: "es", level: "high" });
  assert.deepEqual(parsePrefsValue("ko.-"), { lang: "ko", level: null });
  assert.deepEqual(parsePrefsValue("-.elem"), { lang: null, level: "elem" });
  assert.deepEqual(parsePrefsValue("xx.uni"), { lang: null, level: "uni" });
  for (const bad of ["", "garbage", "es.high.x", "<script>.uni", "es%2Ehigh%2Eextra", "x".repeat(40)]) {
    assert.deepEqual(parsePrefsValue(bad), { lang: null, level: null }, bad);
  }
  // Malformed percent-encoding must not throw a URIError.
  assert.deepEqual(parsePrefsValue("%E0%A4%A"), { lang: null, level: null });
  assert.deepEqual(readPrefsCookie("a=1; eugene-desk-prefs=vi.mid; b=2"), { lang: "vi", level: "mid" });
  assert.deepEqual(readPrefsCookie("other-eugene-desk-prefs=vi.mid"), { lang: null, level: null });
  assert.deepEqual(readPrefsCookie(undefined), { lang: null, level: null });
  assert.deepEqual(readPrefsCookie("eugene-desk-prefs=%E0%A4%A"), { lang: null, level: null });
});

test("prefs cookie is first-party, Lax, site-wide, one year", () => {
  assert.equal(
    prefsCookieString("es.high", true),
    "eugene-desk-prefs=es.high; Max-Age=31536000; Path=/; SameSite=Lax; Secure",
  );
  assert.equal(
    prefsCookieString(null, false),
    "eugene-desk-prefs=; Max-Age=0; Path=/; SameSite=Lax",
  );
});

test("cookie-aware HTML is private, varies on Cookie, and the server store is never mutated", () => {
  const src = join(import.meta.dirname, "..");
  const root = readFileSync(join(src, "routes/__root.tsx"), "utf8");
  assert.match(root, /setResponseHeader\("Cache-Control", "private, no-cache"\)/);
  assert.match(root, /setResponseHeader\("Vary", "Cookie"\)/);
  assert.match(root, /<DeskHintContext\.Provider value=\{hint\}>/);
  const store = readFileSync(join(src, "lib/store.ts"), "utf8");
  // Server render reads a per-request hinted snapshot, not a shared mutable store.
  assert.match(store, /\(\) => selector\(hintedInitialState\(hint\)\)/);
  assert.doesNotMatch(store, /useDesk\.setState\(\{\s*lang: hint/);
});

test("SSR function runs in a single region near Eugene (Hobby allows one)", () => {
  const repo = join(import.meta.dirname, "../..");
  const vercel = JSON.parse(readFileSync(join(repo, "vercel.json"), "utf8")) as { regions?: string[] };
  assert.deepEqual(vercel.regions, ["pdx1"]);
  const vite = readFileSync(join(repo, "vite.config.ts"), "utf8");
  assert.match(vite, /vercel: \{ functions: \{ regions: \["pdx1"\] \} \}/);
});

test("preview bridge stays mounted but only loads when framed", () => {
  const src = join(import.meta.dirname, "..");
  const root = readFileSync(join(src, "routes/__root.tsx"), "utf8");
  assert.match(root, /<PreviewHostBridge \/>/);
  const bridge = readFileSync(join(src, "components/preview-host-bridge.tsx"), "utf8");
  assert.doesNotMatch(bridge, /^import[^;]*from "@\/lib\/preview-host-bridge"/m);
  assert.match(bridge, /window\.parent === window\) return;/);
  assert.match(bridge, /import\("@\/lib\/preview-host-bridge"\)/);
});
test("SSR, boot script and client agree on <html lang> for every language", () => {
  for (const lang of ["en", "zh", "es", "ko", "vi", "ja"] as const) {
    assert.equal(htmlLang(lang), BOOT_HTML_LANG[lang]);
  }
  assert.equal(htmlLang("zh"), "zh-CN");
});

// ---- 2026-10-14 upgrade: palette, quick links, weather line, starters, .ics, lock screen ----
import { buildIcs, icsEscape, icsFold, ICS_FILENAME } from "./ics.ts";
import { skyAdvice } from "./sky-advice.ts";
import { sampleSlots } from "./schedule-samples.ts";
import { quickLinks, ALL_QUICK_LINKS } from "../data/quick-links.ts";
import { soonDays } from "./days.ts";
import { wrap, lockLayout, MIN_CARD_H } from "./lock-screen.ts";

test("upgrade copy keys exist in all six languages", () => {
  const keys = [
    "quickLinks",
    "opensNewTab",
    "paletteOpen",
    "palettePlaceholder",
    "paletteEmpty",
    "palettePages",
    "palettePlaces",
    "paletteDates",
    "paletteSettings",
    "paletteLinks",
    "wednesdayRelease",
    "quickAdd",
    "fillSample",
    "sampleHint",
    "sampleClass",
    "exportIcs",
    "icsDone",
    "icsNone",
    "lockImage",
    "lockImageFailed",
    "lockImageSaved",
    "undoFailed",
    "weekTitle",
  ] as const;
  for (const key of keys) {
    const seen = new Set<string>();
    for (const lang of ["en", "zh", "es", "ko", "vi", "ja"] as const) {
      const text = deskText(lang, key, { n: 1 });
      assert.ok(text.trim(), `${key}.${lang}`);
      seen.add(text);
    }
    assert.ok(seen.size > 1, `${key} is not just English everywhere`);
  }
  assert.equal(deskText("zh", "fillSample"), "填入示例时段");
  assert.equal(deskText("en", "exportIcs"), "Export to calendar (.ics)");
  assert.equal(deskText("zh", "lockImage"), "导出锁屏图");
});

test("weather one-liners reuse existing es/ko/vi/ja pack entries", () => {
  const packs = [esPack, koPack, viPack, jaPack] as Record<string, string>[];
  for (const kind of ["clear", "rain", "storm", "fog", "snow"] as const) {
    for (const level of ["uni", "high"] as const) {
      const copy = skyAdvice(kind, level);
      assert.ok(copy?.zh, `${kind}/${level} has zh`);
      for (const pack of packs) assert.ok(pack[copy!.en], `pack has "${copy!.en}"`);
    }
  }
  assert.equal(skyAdvice("cloud", "uni"), null);
  assert.equal(skyAdvice("clear", "uni")?.en, "If this holds, the quad is actually usable.");
  assert.equal(skyAdvice("rain", "mid")?.en, "Grab a jacket. Don't stand in the rain.");
});

test("quick links follow level and district, https only", () => {
  assert.ok(quickLinks("uni", null).some((l) => l.href.startsWith("https://canvas.uoregon.edu")));
  assert.ok(quickLinks("elem", null).some((l) => l.id === "4j-calendar"));
  assert.deepEqual(
    quickLinks("mid", "bethel").map((l) => l.id),
    ["bethel"],
  );
  assert.ok(quickLinks("high", "4j").some((l) => l.id === "fafsa"));
  assert.ok(!quickLinks("mid", "4j").some((l) => l.id === "fafsa"));
  for (const link of ALL_QUICK_LINKS) {
    assert.match(link.href, /^https:\/\//);
    for (const lang of ["en", "zh", "es", "ko", "vi", "ja"] as const)
      assert.ok(link.label[lang], link.id);
  }
});

test("sample week: UO MWF 10:00-10:50 + TTh 10:00-11:20, valid K-12 slots, no overlaps", () => {
  const uni = sampleSlots("uni");
  assert.deepEqual(
    uni.map((s) => `${s.day} ${s.start}-${s.end}`),
    ["mon 10:00-10:50", "wed 10:00-10:50", "fri 10:00-10:50", "tue 10:00-11:20", "thu 10:00-11:20"],
  );
  for (const level of ["elem", "mid", "high", "uni"] as const) {
    const slots = sampleSlots(level);
    assert.ok(slots.length >= 2 && slots.length <= 6);
    for (const s of slots) assert.ok(validScheduleTime(s.start, s.end), `${level} ${s.start}`);
    const blocks = slots.map((s, i) => ({
      ...s,
      id: String(i),
      title: "x",
      place: "",
      pinned: false,
    }));
    assert.equal(conflictingClassIds(blocks).size, 0, level);
  }
});

test("soon badge window is today through seven days out", () => {
  assert.equal(soonDays("2026-10-14", "2026-10-14"), 0);
  assert.equal(soonDays("2026-10-14", "2026-10-21"), 7);
  assert.equal(soonDays("2026-10-14", "2026-10-22"), null);
  assert.equal(soonDays("2026-10-14", "2026-10-13"), null);
});

test(".ics export builds valid all-day and timed events", () => {
  const now = new Date("2026-10-14T23:00:00Z");
  const ics = buildIcs(
    [
      {
        id: "drop",
        ymd: "2026-11-08",
        title: "Last day to drop, with W; see notes",
        detail: "Line 1\nLine 2",
      },
      { id: "wait list", ymd: "2026-10-20", time: "09:00", title: "Waitlisting ends" },
      { id: "bad", ymd: "2026-13-40", title: "skip me" },
    ],
    now,
  );
  assert.equal(ICS_FILENAME, "eugene-desk-calendar.ics");
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  assert.doesNotMatch(ics.replace(/\r\n/g, ""), /\n/);
  assert.equal(ics.match(/BEGIN:VEVENT/g)?.length, 2);
  assert.match(ics, /DTSTART;VALUE=DATE:20261108\r\nDTEND;VALUE=DATE:20261109/);
  assert.match(
    ics,
    /DTSTART;TZID=America\/Los_Angeles:20261020T090000\r\nDTEND;TZID=America\/Los_Angeles:20261020T093000/,
  );
  assert.match(ics, /BEGIN:VTIMEZONE/);
  assert.match(ics, /UID:wait-list-20261020@eugene-desk\.vercel\.app/);
  assert.match(ics, /DTSTAMP:20261014T230000Z/);
  assert.match(ics, /SUMMARY:Last day to drop\\, with W\\; see notes/);
  assert.match(ics, /DESCRIPTION:Line 1\\nLine 2/);
  assert.doesNotMatch(ics, /skip me/);
  // All-day only: no timezone block needed.
  assert.doesNotMatch(
    buildIcs([{ id: "a", ymd: "2026-11-26", title: "Thanksgiving" }], now),
    /VTIMEZONE/,
  );
  assert.equal(icsEscape("a\\b;c,d\ne"), "a\\\\b\\;c\\,d\\ne");
  const folded = icsFold("SUMMARY:" + "期末".repeat(40));
  for (const line of folded.split("\r\n")) assert.ok(new TextEncoder().encode(line).length <= 75);
  assert.equal(folded.split("\r\n ").join(""), "SUMMARY:" + "期末".repeat(40));
});

test("palette and lock-screen code stay out of the first-load bundle", () => {
  const src = join(import.meta.dirname, "..");
  const shell = readFileSync(join(src, "components/shell.tsx"), "utf8");
  assert.match(shell, /import\("@\/components\/command-palette"\)/);
  assert.doesNotMatch(shell, /^import .*command-palette/m);
  assert.doesNotMatch(shell, /from\s+["']cmdk["']/);
  const week = readFileSync(join(src, "components/week-schedule.tsx"), "utf8");
  assert.match(week, /await import\("@\/lib\/lock-screen"\)/);
  assert.doesNotMatch(week, /^import .*lock-screen/m);
  assert.doesNotMatch(week, /<canvas/);
  const cmdkUsers: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(tsx|ts)$/.test(name) && /from\s+["']cmdk["']/.test(readFileSync(p, "utf8"))) {
        cmdkUsers.push(p.slice(src.length + 1));
      }
    }
  };
  walk(src);
  assert.deepEqual(cmdkUsers, ["components/command-palette.tsx"]);
});

test(".ics skips days that do not exist on the calendar", () => {
  const ics = buildIcs(
    [
      { id: "ok", ymd: "2026-11-11", title: "Veterans Day" },
      { id: "bad", ymd: "2026-02-31", title: "Not a day" },
      { id: "bad2", ymd: "2027-02-29", title: "Not a leap day" },
      { id: "leap", ymd: "2028-02-29", title: "Real leap day" },
    ],
    new Date("2026-10-14T12:00:00Z"),
  );
  assert.match(ics, /DTSTART;VALUE=DATE:20261111/);
  assert.match(ics, /DTSTART;VALUE=DATE:20280229/);
  // Date.parse would have rolled these two into March and exported them.
  assert.doesNotMatch(ics, /2026-02-31|20260303|20270301/);
  assert.doesNotMatch(ics, /Not a day|Not a leap day/);
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 2);
});

test("lock-screen wrap never drops a title tail without an ellipsis", () => {
  // Real text metrics are not available under node, so each glyph is one unit wide.
  const ctx = { measureText: (s: string) => ({ width: [...s].length }) } as unknown as CanvasRenderingContext2D;
  const width = 6;
  const maxLines = 2;

  // 11 glyphs fit in two six-wide lines: nothing may be dropped or marked.
  assert.deepEqual(wrap(ctx, "微观经济学原理研讨课程", width, maxLines), ["微观经济学原", "理研讨课程"]);
  // 14 glyphs: the tail must be marked, never silently dropped.
  const cjk = wrap(ctx, "微观经济学原理研讨课程安排表", width, maxLines);
  assert.deepEqual(cjk, ["微观经济学原", "理研讨课程…"]);
  assert.ok(cjk.join("").endsWith("…"));

  const english = wrap(ctx, "Advanced Microeconomics Seminar Series", 12, maxLines);
  assert.equal(english.at(-1)?.endsWith("…"), true, JSON.stringify(english));
  assert.deepEqual(wrap(ctx, "Calculus", 12, maxLines), ["Calculus"]);

  // A title that fills the last line completely still gets its ellipsis.
  const filled = wrap(ctx, "数据结构与算法设计基础课表", width, maxLines);
  assert.equal(filled.at(-1)?.endsWith("…"), true, JSON.stringify(filled));
  assert.ok(filled.join("").replace("…", "").length <= width * maxLines);
});

test("lock-screen layout never squeezes cards below a readable height (audit 10-15 P2)", () => {
  const avail = 926; // gridBottom - gridTop - header on the 1080x1920 canvas
  const gap = 14;
  for (const count of [1, 3, 8, 10, 11, 15, 40]) {
    const { shown, more, cardH } = lockLayout(count, avail, gap);
    const slots = shown + (more > 0 ? 1 : 0);
    assert.equal(shown + more, count);
    assert.ok(cardH >= MIN_CARD_H, `count ${count}: cardH ${cardH}`);
    assert.ok(slots * cardH + (slots - 1) * gap <= avail + 0.001, `count ${count} overflows`);
  }
  assert.deepEqual(lockLayout(15, avail, gap).more > 0, true);
  assert.equal(lockLayout(3, avail, gap).more, 0);
});

test("lock-screen wrap breaks a word wider than the card", () => {
  const ctx = { measureText: (s: string) => ({ width: s.length * 14 }) } as unknown as CanvasRenderingContext2D;
  const lines = wrap(ctx, "IntroductionToMicroeconomics Seminar", 147, 3);
  for (const line of lines) assert.ok(line.length * 14 <= 147, JSON.stringify(lines));
  assert.ok(lines.at(-1)!.endsWith("…"));
  assert.deepEqual(wrap(ctx, "Calculus", 147, 3), ["Calculus"]);
});

import { starterTasks, applicableChecks } from "./starter-tasks.ts";
import { k12Checks } from "../data/k12.ts";
import { placeSearchWithQuery, placeSearchWithCategory, placeSelectionSearch, validatePlaceSearch, parsePlaceSearch, effectivePlaceCategory } from "./place-search-state.ts";

test("weighted-only historical GPA keeps its scale when a class is added or removed", () => {
  const prior = { gpa: null, weighted: 450, credits: 1000 };
  const estimate = (rows: Parameters<typeof targetGpaEstimate>[1]) => targetGpaEstimate("high", rows, prior, "4.50", "0.5");
  assert.deepEqual(estimate([]), { weighted: true, ceiling: 5, needed: 4.5, met: true });
  assert.deepEqual(estimate([{ grade: "A", credits: 0.5, boost: true }]), { weighted: true, ceiling: 5, needed: 4, met: true });
  assert.deepEqual(estimate([]), { weighted: true, ceiling: 5, needed: 4.5, met: true });
  assert.equal(targetGpaEstimate("high", [], prior, "5.01", "0.5").needed, null);
});
test("an already-met target reports met, not a smaller required average", () => {
  const rows = [{ grade: "B" as const, credits: 4, boost: false }];
  const prior = { gpa: 380, weighted: null, credits: 1000 };
  const met = targetGpaEstimate("uni", rows, prior, "3.50", "1");
  assert.equal(met.met, true);
  assert.equal(met.needed, 2.5);
  const unmet = targetGpaEstimate("uni", rows, prior, "4.20", "1");
  assert.equal(unmet.met, false);
  assert.equal(unmet.needed, 13);
  assert.ok((unmet.needed ?? 0) > unmet.ceiling);
  const empty = targetGpaEstimate("uni", [], { gpa: null, weighted: null, credits: null }, "3.5", "1");
  assert.equal(empty.met, false);
  assert.equal(empty.needed, null);
});
test("target GPA never mixes weighted history into an unweighted or university scale", () => {
  const rows = [{ grade: "A" as const, credits: 1, boost: true }];
  assert.deepEqual(targetGpaEstimate("high", rows, { gpa: 350, weighted: 450, credits: 1000 }, "3.50", "1"),
    { weighted: false, ceiling: 4, needed: 3, met: true });
  assert.equal(targetGpaEstimate("high", rows, { gpa: 350, weighted: 450, credits: 1000 }, "4.50", "1").needed, null);
  assert.deepEqual(targetGpaEstimate("uni", rows, { gpa: 350, weighted: null, credits: 1000 }, "3.50", "1"),
    { weighted: false, ceiling: 4.3, needed: 3, met: true });
  assert.equal(targetGpaEstimate("mid", [], { gpa: null, weighted: null, credits: null }, "3.5", "1").needed, null);
});
test("full guide uses the same district/date applicability as starters without changing stored completion IDs", () => {
  for (const level of ["elem", "mid", "high"] as const) {
    const original = structuredClone(k12Checks[level]);
    for (const district of ["4j", "bethel", "springfield", null] as const) {
      const list = applicableChecks(k12Checks[level], district, "2026-10-15");
      assert.deepEqual(list.slice(0, 3), starterTasks(level, district, "2026-10-15"));
      if (district && district !== "4j") assert.ok(list.every(item => item.district !== "4j"));
    }
    assert.deepEqual(k12Checks[level], original);
  }
  const hasGrade = (date: string) => applicableChecks(k12Checks.mid, "4j", date).some(item => item.id === "grade");
  assert.equal(hasGrade("2026-11-05"), true);
  assert.equal(hasGrade("2026-11-06"), true);
  assert.equal(hasGrade("2026-11-07"), false);
  const source = readFileSync(join(import.meta.dirname, "../components/k12-guide.tsx"), "utf8");
  assert.match(source, /applicableChecks\(k12Checks\[level\], district, clock\?\.ymd \?\? null\)/);
  assert.match(source, /const done = list\.filter/);
});
test("typing keeps the category but an explicit palette pick clears it", () => {
  const filtered = validatePlaceSearch({ q: "old", cat: "dining" }, "campus", "uni");
  assert.deepEqual(placeSearchWithQuery(filtered, "Knight Library"), { q: "Knight Library", cat: "dining" });
  const selected = placeSelectionSearch("Knight Library");
  assert.deepEqual(selected, { q: "Knight Library" });
  assert.deepEqual(placeSearchWithCategory(selected, "dining"), { q: "Knight Library", cat: "dining" });
  assert.equal(placeSearchWithCategory(filtered, "all").cat, undefined);
  assert.equal(placeSearchWithQuery(filtered, "").cat, "dining");
  assert.deepEqual(validatePlaceSearch({ cat: "coffee" }, "campus", "uni"), {});
  assert.deepEqual(validatePlaceSearch({ cat: "study" }, "town", "uni"), {});
  // ?cat= only accepts chips the page shows for that level (town has no coffee chip for K-8).
  assert.deepEqual(validatePlaceSearch({ cat: "coffee" }, "town", "mid"), {});
  assert.deepEqual(validatePlaceSearch({ cat: "coffee" }, "town", "elem"), {});
  assert.deepEqual(validatePlaceSearch({ cat: "coffee" }, "town", "uni"), { cat: "coffee" });
  assert.deepEqual(validatePlaceSearch({ cat: "coffee" }, "town", "high"), { cat: "coffee" });
  assert.deepEqual(validatePlaceSearch({ cat: "study" }, "town", "mid"), {});
  assert.deepEqual(validatePlaceSearch({ cat: "coffee" }, "campus", "high"), {});
  // The route parse is level-independent (SSR has no saved level); the page narrows it.
  assert.deepEqual(parsePlaceSearch({ cat: "coffee", q: "x" }, "town"), { q: "x", cat: "coffee" });
  assert.deepEqual(parsePlaceSearch({ cat: "bogus" }, "town"), {});
  assert.deepEqual(parsePlaceSearch({ cat: "coffee" }, "campus"), {});
  assert.equal(effectivePlaceCategory("coffee", "town", "mid"), undefined);
  assert.equal(effectivePlaceCategory("coffee", "town", "elem"), undefined);
  assert.equal(effectivePlaceCategory("coffee", "town", "uni"), "coffee");
  assert.equal(effectivePlaceCategory("eat", "town", "mid"), "eat");
  assert.equal(effectivePlaceCategory("all", "town", "uni"), undefined);
  assert.equal(effectivePlaceCategory(undefined, "campus", "uni"), undefined);
  const browser = readFileSync(join(import.meta.dirname, "../components/place-browser.tsx"), "utf8");
  assert.doesNotMatch(browser, /useState/);
  for (const route of ["campus", "town"]) {
    const source = readFileSync(join(import.meta.dirname, `../routes/${route}.tsx`), "utf8");
    assert.match(source, /category=\{cat\}/);
    assert.match(source, /onCategoryChange=\{setCategory\}/);
    assert.match(source, /parsePlaceSearch\(search, "/);
    assert.doesNotMatch(source, /getState\(\)\.level/);
    assert.match(source, /usePlaceCategoryGuard\("\//);
    assert.match(source, /effectivePlaceCategory\(rawCat/);
  }
});
test("starter tasks drop past dates and 4J-only items for other districts (audit 10-15 P2)", () => {
  const ids = (level: Parameters<typeof starterTasks>[0], district: Parameters<typeof starterTasks>[1], ymd: string | null) =>
    starterTasks(level, district, ymd).map((t) => t.id);
  assert.deepEqual(ids("uni", null, "2026-10-02"), ["schedule", "knight", "bus"]);
  assert.deepEqual(ids("uni", null, "2026-10-03"), ["schedule", "knight", "bus"]); // still the day itself
  assert.ok(!ids("uni", null, "2026-10-15").includes("schedule"));
  assert.equal(ids("uni", null, "2026-10-15").length, 3);
  for (const level of ["elem", "mid", "high"] as const) {
    for (const district of ["bethel", "springfield"] as const) {
      const picked = starterTasks(level, district, "2026-10-15");
      assert.ok(picked.every((t) => t.district !== "4j"), `${level}/${district}`);
      assert.equal(picked.length, 3);
    }
  }
  assert.ok(ids("mid", "4j", "2026-10-15").includes("wed"));
  assert.ok(ids("mid", null, "2026-10-15").includes("wed"));
  assert.ok(!ids("mid", "bethel", "2026-10-15").includes("wed"));
  assert.ok(!ids("mid", "bethel", "2026-10-15").includes("grade"));
});
test("Wednesday pickup line says 3:40 rides arrive late, in all six languages (audit 10-15 P3)", async () => {
  const fs = await import("node:fs");
  const k12 = fs.readFileSync(new URL("../data/k12.ts", import.meta.url), "utf8");
  assert.match(k12, /Rides that assume 3:40 will be late\./);
  assert.match(k12, /会晚到/);
  assert.doesNotMatch(k12, /3:40 will be early|会早到/);
  for (const l of ["es", "ko", "vi", "ja"]) {
    const pack = JSON.parse(fs.readFileSync(new URL(`./i18n/${l}.json`, import.meta.url), "utf8"));
    assert.ok(pack["Wednesday release is 2:35. Rides that assume 3:40 will be late."], l);
  }
});

test("the place search lives in the route, so ?q= can pre-fill twice", () => {
  const src = join(import.meta.dirname, "..");
  const shared = readFileSync(join(src, "lib/place-search.ts"), "utf8");
  assert.match(shared, /export function usePlaceQueryWriter/);
  // Writes replace the history entry: typing must not fill the back button.
  assert.match(shared, /replace: true/);
  for (const [route, path, to] of [
    ["town", "town.tsx", "/town"],
    ["campus", "campus.tsx", "/campus"],
  ] as const) {
    const text = readFileSync(join(src, "routes", path), "utf8");
    assert.match(text, new RegExp(`usePlaceQueryWriter\\("${to}"\\)`), `${route} writes ?q=`);
    assert.match(text, /<PlaceBrowser[\s\S]*?query=\{q \?\? ""\}/, `${route} drives the box from ?q=`);
    // The key is what made a same-URL pick a no-op: the box stayed empty because the
    // component never remounted and the parameter had already been consumed.
    assert.doesNotMatch(text, /key=\{(?:`\$\{level\}:)?q/, `${route} must not key on ?q=`);
  }
  const browser = readFileSync(join(src, "components/place-browser.tsx"), "utf8");
  assert.match(browser, /onQueryChange: \(next: string\) => void/);
  assert.doesNotMatch(browser, /useState\(initialQuery\)/, "the box is controlled by the route");
});

import { canRestore, DESK_LIMITS as LIMITS } from "./desk-limits.ts";
test("undo still restores when the list is back at its limit; only over-limit or duplicates refuse", () => {
  const list = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `n${i}` }));
  assert.equal(canRestore(list(LIMITS.notes), "gone", "notes"), true);
  assert.equal(canRestore(list(LIMITS.notes - 1), "gone", "notes"), true);
  assert.equal(canRestore(list(LIMITS.notes + 1), "gone", "notes"), false);
  assert.equal(canRestore(list(3), "n1", "notes"), false);
  assert.equal(canRestore(list(LIMITS.schedule), "gone", "schedule"), true);
  assert.equal(canRestore(list(LIMITS.schedule + 1), "gone", "schedule"), false);
  const store = readFileSync(join(import.meta.dirname, "store.ts"), "utf8");
  assert.match(store, /canRestore\(bucket\.notes, note\.id, "notes"\)/);
  assert.match(store, /canRestore\(bucket\.schedule, row\.id, "schedule"\)/);
  // Adding keeps the >= check.
  assert.match(store, /bucket\.notes\.length >= DESK_LIMITS\.notes/);
  assert.match(store, /bucket\.schedule\.length >= DESK_LIMITS\.schedule/);
});

test("hydration level: explicit save wins, else a valid cookie level, else the default", () => {
  const unsaved = { level: "uni", levelSet: false };
  assert.deepEqual(resolveHydratedLevel(unsaved, readPrefsCookie("eugene-desk-prefs=-.mid"), "uni"), { level: "mid", levelSet: true });
  assert.deepEqual(resolveHydratedLevel(unsaved, readPrefsCookie("eugene-desk-prefs=zh.high"), "uni"), { level: "high", levelSet: true });
  assert.deepEqual(resolveHydratedLevel({ level: "uni", levelSet: true }, readPrefsCookie("eugene-desk-prefs=-.mid"), "uni"), { level: "uni", levelSet: true });
  assert.deepEqual(resolveHydratedLevel(unsaved, readPrefsCookie("eugene-desk-prefs=zh.-"), "uni"), { level: "uni", levelSet: false });
  assert.deepEqual(resolveHydratedLevel(unsaved, { lang: null, level: "phd" as never }, "uni"), { level: "uni", levelSet: false });
  // The adopted level round-trips into the same cookie value, so it is not cleared.
  const kept = resolveHydratedLevel(unsaved, readPrefsCookie("eugene-desk-prefs=-.mid"), "uni");
  assert.equal(formatPrefsValue({ lang: "en", langSet: false, ...kept }), "-.mid");
});
