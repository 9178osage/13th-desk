import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deleteRecoveryCopy,
  listRecoveryCopies,
  readRecoveryState,
  recoveryFileName,
  RECOVERY_PREFIX,
} from "./recovery-copies.ts";
import { wrapRecoveryCopy } from "./recovery-format.ts";

/** A localStorage stand-in with `length`/`key()` enumeration. */
function memoryStorage(entries: Record<string, string>) {
  const data = new Map(Object.entries(entries));
  return {
    data,
    get length() {
      return data.size;
    },
    key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

const save = (notes: string[], extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    state: {
      lang: "en",
      level: "uni",
      buckets: {
        uni: {
          notes: notes.map((text, i) => ({ id: `n${i}`, text, done: false })),
          grades: [{ id: "g", title: "Math", credits: 4, grade: "A" }],
          schedule: [],
        },
        high: { notes: [{ id: "h", text: "AP", done: false }] },
      },
    },
    version: 0,
    ...extra,
  });

test("recovery copies list newest first, with counts read by the save reader", () => {
  const storage = memoryStorage({
    "13th-desk-v1": save(["live"]),
    "13th-desk-v1:pre-import": "{}",
    [`${RECOVERY_PREFIX}old`]: wrapRecoveryCopy(
      save(["a"]),
      "conflict",
      new Date("2026-11-01T10:00:00Z"),
    ),
    [`${RECOVERY_PREFIX}new`]: wrapRecoveryCopy(
      save(["a", "b"]),
      "old-tab",
      new Date("2026-11-20T10:00:00Z"),
    ),
    // Written before copies carried metadata: the bare save.
    [`${RECOVERY_PREFIX}bare`]: save(["x", "y", "z"]),
    // An unreadable save an import replaced: download only.
    [`${RECOVERY_PREFIX}broken`]: wrapRecoveryCopy(
      "{broken",
      "unreadable",
      new Date("2026-11-20T12:00:00Z"),
    ),
  });
  const copies = listRecoveryCopies(storage);
  assert.deepEqual(
    copies.map((copy) => copy.key.slice(RECOVERY_PREFIX.length)),
    ["broken", "new", "old", "bare"],
  );
  const byId = Object.fromEntries(
    copies.map((copy) => [copy.key.slice(RECOVERY_PREFIX.length), copy]),
  );
  assert.equal(byId.new.source, "old-tab");
  assert.equal(byId.new.createdAt, "2026-11-20T10:00:00.000Z");
  assert.equal(byId.new.summary?.totalNotes, 3);
  assert.equal(byId.new.summary?.stages.uni.notes, 2);
  assert.equal(byId.new.summary?.stages.high.notes, 1);
  assert.equal(byId.new.summary?.totalGrades, 1);
  assert.equal(byId.bare.source, "unknown");
  assert.equal(byId.bare.createdAt, null);
  assert.equal(byId.bare.summary?.stages.uni.notes, 3, "legacy bare copies are restorable");
  assert.equal(byId.broken.state, null, "unreadable: no restore");
  assert.equal(byId.broken.raw, "{broken", "but the original bytes are downloadable");
});

test("only a value the save loader accepts can be restored", () => {
  assert.notEqual(readRecoveryState(save(["ok"])), null);
  assert.equal(readRecoveryState(save(["future"], { version: 1 })), null);
  assert.equal(readRecoveryState("{broken"), null);
  assert.equal(readRecoveryState(JSON.stringify({ state: { level: "college" } })), null);
  assert.equal(readRecoveryState("[]"), null);
});

test("copies are deleted one at a time and nothing outside the prefix can be deleted", () => {
  const storage = memoryStorage({
    "13th-desk-v1": save(["live"]),
    [`${RECOVERY_PREFIX}a`]: save(["a"]),
    [`${RECOVERY_PREFIX}b`]: save(["b"]),
  });
  assert.equal(deleteRecoveryCopy(storage, "13th-desk-v1"), false);
  assert.equal(deleteRecoveryCopy(storage, "13th-desk-v1:pre-import"), false);
  assert.equal(storage.data.has("13th-desk-v1"), true);
  assert.equal(deleteRecoveryCopy(storage, `${RECOVERY_PREFIX}a`), true);
  assert.deepEqual([...storage.data.keys()], ["13th-desk-v1", `${RECOVERY_PREFIX}b`]);
});

test("downloaded copies get a dated or id-based file name", () => {
  assert.match(
    recoveryFileName({ key: `${RECOVERY_PREFIX}x`, createdAt: "2026-11-20T18:05:00.000Z" }),
    /^eugene-desk-recovery-2026-11-\d\d-\d{4}\.json$/,
  );
  assert.equal(
    recoveryFileName({ key: `${RECOVERY_PREFIX}abc-123/..`, createdAt: null }),
    "eugene-desk-recovery-abc-123.json",
  );
});
