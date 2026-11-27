import { test } from "node:test";
import assert from "node:assert/strict";
import { findMalformedFlag, parseDeskBackup, serializeDeskBackup } from "./desk-backup.ts";
import type { PersistedDeskLike } from "./desk-backup.ts";
import { deskText } from "./desk-copy.ts";
import { emptyBucket } from "./desk-records.ts";

function desk(): PersistedDeskLike {
  const state: PersistedDeskLike = {
    lang: "en",
    langSet: true,
    level: "high",
    levelSet: true,
    earlyStart: false,
    district: null,
    buckets: { elem: emptyBucket(), mid: emptyBucket(), high: emptyBucket(), uni: emptyBucket() },
  };
  state.buckets.uni.notes = [
    { id: "n1", text: "Read ch. 3", done: false },
    { id: "n2", text: "Lab report", done: true },
  ];
  state.buckets.high.grades = [{ id: "g1", title: "AP Bio", credits: 1, grade: "A", boost: true }];
  state.buckets.high.schedule = [
    {
      id: "s1",
      day: "mon",
      start: "09:00",
      end: "10:00",
      title: "Bio",
      place: "",
      pinned: false,
    },
  ];
  return state;
}

function fileWith(edit: (state: Record<string, any>) => void): string {
  const file = JSON.parse(JSON.stringify(serializeDeskBackup(desk(), "2026-11-27T12:00:00.000Z")));
  edit(file.state);
  return JSON.stringify(file);
}

test("the app's own export still imports with every flag intact", () => {
  const result = parseDeskBackup(JSON.stringify(serializeDeskBackup(desk())));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(
    result.backup.state.buckets.uni.notes.map((n) => n.done),
    [false, true],
  );
  assert.equal(result.backup.state.buckets.high.grades[0].boost, true);
  assert.equal(result.backup.state.buckets.high.schedule[0].pinned, false);
});

test('a "false" string for done is refused with its place, not imported as done', () => {
  const result = parseDeskBackup(fileWith((s) => (s.buckets.uni.notes[1].done = "false")));
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error, "flag");
  assert.deepEqual(result.flag, { level: "uni", list: "notes", row: 2, field: "done" });
});

test('a "true" string for boost is refused, not imported as unweighted', () => {
  const result = parseDeskBackup(fileWith((s) => (s.buckets.high.grades[0].boost = "true")));
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.deepEqual(result.flag, { level: "high", list: "grades", row: 1, field: "boost" });
});

test("numbers and null are refused for pinned too", () => {
  for (const bad of [1, 0, null]) {
    const result = parseDeskBackup(fileWith((s) => (s.buckets.high.schedule[0].pinned = bad)));
    assert.equal(result.ok, false, String(bad));
    if (!result.ok) assert.equal(result.flag?.field, "pinned");
  }
});

test("a missing flag still imports as false (older exports)", () => {
  const result = parseDeskBackup(
    fileWith((s) => {
      delete s.buckets.uni.notes[0].done;
      delete s.buckets.high.grades[0].boost;
      delete s.buckets.high.schedule[0].pinned;
    }),
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.backup.state.buckets.uni.notes[0].done, false);
  assert.equal(result.backup.state.buckets.high.grades[0].boost, false);
  assert.equal(result.backup.state.buckets.high.schedule[0].pinned, false);
});

test("findMalformedFlag ignores lists it cannot read and real booleans", () => {
  assert.equal(findMalformedFlag(null), null);
  assert.equal(findMalformedFlag({ uni: { notes: "x" } }), null);
  assert.equal(findMalformedFlag(desk().buckets), null);
});

test("the location message reads naturally in all six languages", () => {
  for (const lang of ["en", "zh", "es", "ko", "vi", "ja"] as const) {
    for (const key of [
      "importBadFlagNotes",
      "importBadFlagGrades",
      "importBadFlagSchedule",
    ] as const) {
      const text = deskText(lang, key, { row: 2, level: "Uni" });
      assert.ok(text.includes("2") && text.includes("Uni"), `${lang} ${key}`);
      assert.ok(!/\{\w+\}/.test(text), `${lang} ${key} leaves a placeholder`);
    }
  }
});
