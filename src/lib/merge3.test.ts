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
