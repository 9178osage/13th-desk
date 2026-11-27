/**
 * Audit 2026-11-27: undo import (P1-01), recovery format checks (P2-01), the shared
 * pre-import snapshot (P2-07) and the dialog Tab trap (P2-04).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DESK_PRE_IMPORT_EVENT,
  DESK_PRE_IMPORT_KEY,
  deskFingerprint,
  parsePersistedDesk,
  parsePreImportRecord,
  serializeDeskBackup,
  type PersistedDeskLike,
} from "./desk-backup.ts";
import { createDeskStorage, storedEnvelopeSupported } from "./desk-storage.ts";
import { readRecoveryState, saveRecoveryCopy } from "./recovery-copies.ts";
import { unwrapRecoveryCopy } from "./recovery-format.ts";
import { createPreImportState } from "./pre-import-state.ts";
import { trappedTabTarget } from "./modal-focus.ts";

const KEY = "13th-desk-v1";

function desk(notes: string[], extra: Partial<PersistedDeskLike> = {}): PersistedDeskLike {
  const base = parsePersistedDesk({}, "stored")!;
  return {
    ...base,
    ...extra,
    buckets: {
      ...base.buckets,
      uni: {
        ...base.buckets.uni,
        notes: notes.map((text, i) => ({ id: `n${i}`, text, done: false })),
      },
    },
  };
}

test("P1-01: the desk fingerprint ignores key order and changes with any edit", () => {
  const a = desk(["one"]);
  const reordered = Object.fromEntries(
    Object.entries(JSON.parse(JSON.stringify(a)) as Record<string, unknown>).reverse(),
  ) as PersistedDeskLike;
  assert.notEqual(Object.keys(reordered)[0], Object.keys(a)[0]);
  assert.equal(deskFingerprint(a), deskFingerprint(reordered));
  assert.notEqual(deskFingerprint(a), deskFingerprint(desk(["one", "two"])));
  assert.notEqual(deskFingerprint(a), deskFingerprint(desk(["one"], { level: "high" })));
  const done = desk(["one"]);
  done.buckets.uni.notes[0].done = true;
  assert.notEqual(deskFingerprint(a), deskFingerprint(done));
});

test("P1-01: the pre-import snapshot carries the imported desk's fingerprint", () => {
  const before = desk(["before"]);
  const imported = desk(["imported"]);
  const raw = JSON.stringify({
    ...serializeDeskBackup(before),
    importedFingerprint: deskFingerprint(imported),
  });
  const record = parsePreImportRecord(raw);
  assert.deepEqual(record?.state.buckets.uni.notes, before.buckets.uni.notes);
  assert.equal(record?.importedFingerprint, deskFingerprint(imported));
  // A snapshot written by an older version has no fingerprint: undo must ask first.
  const old = parsePreImportRecord(JSON.stringify(serializeDeskBackup(before)));
  assert.equal(old?.importedFingerprint, null);
  assert.equal(parsePreImportRecord(null), null);
  assert.equal(parsePreImportRecord("{"), null);
});

/** Storage adapter on a Map, with Web Locks that run callbacks in order. */
function adapterOn(data: Map<string, string>) {
  return createDeskStorage<PersistedDeskLike>({
    storage: {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, raw) => void data.set(key, raw),
      removeItem: (key) => void data.delete(key),
    },
    status: () => {},
    locks: { request: async (_name, callback) => callback() },
  });
}
const fingerprintMatches =
  (expected: string) =>
  (
    saved: { state: PersistedDeskLike } | null,
    unsaved: { state: PersistedDeskLike } | null,
  ): boolean => {
    const value = unsaved ?? saved;
    const state = value ? parsePersistedDesk(value.state, "stored") : null;
    return state !== null && deskFingerprint(state) === expected;
  };

test("P1-01: undo right after an import replaces the desk; after a later edit it does not", async () => {
  const data = new Map<string, string>();
  const tab = adapterOn(data);
  await tab.storage.getItem(KEY);
  const before = desk(["before"]);
  const imported = desk(["imported"]);
  assert.equal(await tab.replace({ state: imported, version: 0 }), true);
  const importedFp = deskFingerprint(imported);

  // Immediate undo: the desk still matches what the import wrote.
  assert.equal(
    await tab.replaceIf({ state: before, version: 0 }, fingerprintMatches(importedFp)),
    "ok",
  );
  assert.deepEqual(JSON.parse(data.get(KEY)!).state.buckets.uni.notes[0].text, "before");

  // Import again, then add a to-do (as after a refresh) before undoing.
  await tab.replace({ state: imported, version: 0 });
  const edited = desk(["imported", "added after import"]);
  tab.storage.setItem(KEY, { state: edited, version: 0 });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(
    await tab.replaceIf({ state: before, version: 0 }, fingerprintMatches(importedFp)),
    "changed",
    "the later to-do is not silently overwritten",
  );
  assert.deepEqual(
    JSON.parse(data.get(KEY)!).state.buckets.uni.notes.map((n: { text: string }) => n.text),
    ["imported", "added after import"],
  );
  // Confirmed undo: the visitor saw `edited`, so that is the version allowed to be replaced.
  assert.equal(
    await tab.replaceIf({ state: before, version: 0 }, fingerprintMatches(deskFingerprint(edited))),
    "ok",
  );
});

test("P1-01: another tab's edit between the question and the confirmation stops the undo", async () => {
  const data = new Map<string, string>();
  const tab = adapterOn(data);
  await tab.storage.getItem(KEY);
  const imported = desk(["imported"]);
  await tab.replace({ state: imported, version: 0 });
  const seen = desk(["imported", "mine"]);
  tab.storage.setItem(KEY, { state: seen, version: 0 });
  await new Promise((resolve) => setTimeout(resolve, 0));
  // Another tab adds a to-do after this tab's confirmation dialog opened.
  data.set(
    KEY,
    JSON.stringify({ state: desk(["imported", "mine", "other tab"]), version: 0, identity: 1 }),
  );
  assert.equal(
    await tab.replaceIf(
      { state: desk(["before"]), version: 0 },
      fingerprintMatches(deskFingerprint(seen)),
    ),
    "changed",
  );
  assert.match(data.get(KEY)!, /other tab/);
});

test("P1-01: the desk replaced by a confirmed undo is kept as a restorable recovery copy", () => {
  const data = new Map<string, string>();
  const current = desk(["imported", "added after import"]);
  assert.equal(saveRecoveryCopy({ setItem: (k, v) => void data.set(k, v) }, current, "undo"), true);
  const [stored] = [...data.values()];
  const copy = unwrapRecoveryCopy(stored);
  assert.equal(copy.source, "undo");
  assert.deepEqual(readRecoveryState(copy.raw)?.buckets.uni.notes, current.buckets.uni.notes);
  // Quota: reported, nothing thrown.
  assert.equal(
    saveRecoveryCopy(
      {
        setItem: () => {
          throw new Error("quota");
        },
      },
      current,
      "undo",
    ),
    false,
  );
});

test("P2-01: recovery copies use the save loader's version and identity checks", () => {
  const state = desk(["kept"]);
  const raw = (extra: Record<string, unknown>) => JSON.stringify({ state, ...extra });
  assert.ok(readRecoveryState(raw({})), "no markers: legacy save");
  assert.ok(readRecoveryState(raw({ version: 0 })));
  assert.ok(readRecoveryState(raw({ version: 0, identity: 1 })), "current marker");
  assert.equal(readRecoveryState(raw({ version: 0, identity: 2 })), null, "future identity");
  assert.equal(readRecoveryState(raw({ version: 1 })), null, "future version");
  for (const extra of [{}, { version: 0, identity: 1 }, { identity: 2 }, { version: 3 }]) {
    const value = JSON.parse(raw(extra));
    assert.equal(
      storedEnvelopeSupported(value),
      readRecoveryState(raw(extra)) !== null,
      `same answer for ${JSON.stringify(extra)}`,
    );
  }
});

test("P2-07: only the pre-import key (or a full clear) touches the shared undo state", () => {
  const handlers = new Map<string, ((event: Event) => void)[]>();
  let disk: string | null = null;
  let reads = 0;
  const state = createPreImportState({
    read: () => {
      reads++;
      return parsePreImportRecord(disk);
    },
    addWindowListener: (type, fn) => handlers.set(type, [...(handlers.get(type) ?? []), fn]),
  });
  const fire = (type: string, event: Partial<StorageEvent> = {}) =>
    handlers.get(type)?.forEach((fn) => fn(event as Event));
  let notified = 0;
  // Two backup controls (sidebar and footer) share one subscription source.
  state.subscribe(() => notified++);
  state.subscribe(() => notified++);
  assert.equal(state.get(), null);
  // Quota: the snapshot could only be kept in memory.
  const before = desk(["before"]);
  state.set({ state: before, importedFingerprint: "x" });
  const readsBefore = reads;
  fire("storage", { key: KEY, newValue: "{}" });
  fire("storage", { key: "13th-desk-v1:recovery:abc", newValue: "{}" });
  fire("storage", { key: "unrelated", newValue: "1" });
  assert.ok(state.get(), "unrelated edits in another tab keep the in-memory undo");
  assert.equal(reads, readsBefore, "and do not re-read or re-parse the snapshot");
  // Another tab removes the snapshot (undo or dismissal there): cleared here too.
  fire("storage", { key: DESK_PRE_IMPORT_KEY, newValue: null });
  assert.equal(state.get(), null);
  // Another tab imports: its snapshot is shown.
  disk = JSON.stringify(serializeDeskBackup(desk(["other tab before"])));
  fire("storage", { key: DESK_PRE_IMPORT_KEY, newValue: disk });
  assert.equal(state.get()?.state.buckets.uni.notes[0].text, "other tab before");
  // A full clear.
  fire("storage", { key: null });
  assert.equal(state.get(), null);
  // This tab's own write event re-reads once for both controls.
  const r = reads;
  fire(DESK_PRE_IMPORT_EVENT);
  assert.equal(reads, r + 1);
  assert.ok(notified >= 2);
});

test("P2-04: the first Shift+Tab from the dialog title wraps to the last control", () => {
  const items = ["first", "middle", "last"];
  assert.equal(trappedTabTarget(items, "title", true, true), "last", "title is not tabbable");
  assert.equal(trappedTabTarget(items, "title", true, false), "first");
  assert.equal(trappedTabTarget(items, "first", true, true), "last");
  assert.equal(trappedTabTarget(items, "last", true, false), "first");
  assert.equal(trappedTabTarget(items, "middle", true, true), null, "normal moves pass");
  assert.equal(trappedTabTarget(items, "outside", false, true), "last", "focus outside");
  assert.equal(trappedTabTarget(items, null, false, false), "first");
  assert.equal(trappedTabTarget([], "title", true, true), null);
});
