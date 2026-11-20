import { test } from "node:test";
import assert from "node:assert/strict";
import { merge3 } from "./merge3.ts";

test("merge3 keeps both sides' notes by id, applies deletes and field edits", () => {
  const n = (id: string, text: string, done = false) => ({ id, text, done });
  const base = { notes: [n("1", "a"), n("2", "b")], lang: "zh" };
  const ours = { notes: [n("1", "a", true), n("3", "c")], lang: "zh" }; // done 1, deleted 2, added 3
  const theirs = { notes: [n("1", "A"), n("2", "b"), n("4", "d")], lang: "en" }; // renamed 1, added 4
  assert.deepEqual(merge3(base, ours, theirs), {
    notes: [n("1", "A", true), n("4", "d"), n("3", "c")],
    lang: "en",
  });
});
test("merge3: conflicting scalar goes to ours, unchanged side yields the other", () => {
  assert.equal(merge3("a", "b", "c"), "b");
  assert.equal(merge3("a", "a", "c"), "c");
  assert.deepEqual(merge3(undefined, { x: 1 }, { y: 2 }), { y: 2, x: 1 });
});

test("merge3 keeps duplicate ids instead of collapsing them", () => {
  const n = (id: string, text: string) => ({ id, text, done: false });
  const base = { notes: [n("dup", "first"), n("dup", "second")] };
  const ours = { notes: [...base.notes, n("b", "from B")] };
  const theirs = { notes: [...base.notes, n("a", "from A")] };
  assert.deepEqual(merge3(base, ours, theirs), {
    notes: [n("dup", "first"), n("dup", "second"), n("a", "from A"), n("b", "from B")],
  });

  const baseFavs = { favs: ["knight", "knight"] };
  assert.deepEqual(
    merge3(baseFavs, { favs: [...baseFavs.favs, "price"] }, { favs: [...baseFavs.favs, "emu"] }),
    { favs: ["knight", "knight", "emu", "price"] },
  );
});

test("merge3 treats special JSON keys as own data, never as prototypes", () => {
  const ours = JSON.parse('{"__proto__":{"injected":true},"constructor":{"ours":1}}');
  const theirs = JSON.parse('{"constructor":{"theirs":2},"other":true}');
  const result = merge3({}, ours, theirs) as Record<string, unknown>;
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
  assert.equal(Object.hasOwn(result, "__proto__"), true);
  assert.equal(result.injected, undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    ...JSON.parse('{"__proto__":{"injected":true}}'),
    constructor: { theirs: 2, ours: 1 },
    other: true,
  });
});

test("merge3 ignores inherited fields when deciding whether a JSON field was removed", () => {
  const ours = Object.create({ keep: "inherited" }) as Record<string, unknown>;
  ours.add = "mine";
  assert.deepEqual(merge3({ keep: "old" }, ours, { keep: "old", other: "theirs" }), {
    other: "theirs",
    add: "mine",
  });
});

test("audit repro: one side deletes A, the other edits B (same id) — B's edit survives", () => {
  const row = (rowKey: string, text: string) => ({ id: "x", text, done: false, rowKey });
  const base = { notes: [row("ka", "A"), row("kb", "B")] };
  const deletedA = { notes: [row("kb", "B")] };
  const editedB = { notes: [row("ka", "A"), row("kb", "B2")] };
  assert.deepEqual(merge3(base, editedB, deletedA), { notes: [row("kb", "B2")] });
  assert.deepEqual(merge3(base, deletedA, editedB), { notes: [row("kb", "B2")] });
});

test("audit repro on an old save without row keys: keys derived per tab still pair rows", async () => {
  const { withRowKeys } = await import("./desk-records.ts");
  const legacy = {
    buckets: {
      uni: {
        notes: [
          { id: "x", text: "A", done: false },
          { id: "x", text: "B", done: false },
        ],
      },
    },
  };
  // Both tabs read the same old save and derive the same keys independently.
  const tab1 = withRowKeys(structuredClone(legacy));
  const tab2 = withRowKeys(structuredClone(legacy));
  assert.deepEqual(tab1, tab2);
  const [a, b] = tab1.buckets.uni.notes as unknown as { rowKey: string }[];
  assert.notEqual(a.rowKey, b.rowKey);
  // Tab 2 deletes A and saves; tab 1 edited B meanwhile and merges onto that save.
  const theirs = { buckets: { uni: { notes: [tab2.buckets.uni.notes[1]] } } };
  const ours = structuredClone(tab1);
  (ours.buckets.uni.notes[1] as { text: string }).text = "B2";
  const merged = merge3(withRowKeys(legacy), ours, theirs) as typeof legacy;
  assert.deepEqual(
    merged.buckets.uni.notes.map((note) => note.text),
    ["B2"],
  );
});
