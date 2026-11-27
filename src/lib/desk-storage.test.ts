import { test } from "node:test";
import assert from "node:assert/strict";
import { createDeskStorage, type SaveStatus } from "./desk-storage.ts";
import { unwrapRecoveryCopy, wrapRecoveryCopy } from "./recovery-format.ts";

const KEY = "13th-desk-v1";
type Desk = { notes: string[] };
const value = (...notes: string[]) => ({ state: { notes }, version: 0 });
const saved = (data: Map<string, string>) => JSON.parse(data.get(KEY)!).state.notes;
/** A save written by this build in another tab (it carries the identity marker). */
const disk = (...notes: string[]) => JSON.stringify({ ...value(...notes), identity: 1 });

/** Shared localStorage plus a `storage` event bus, like tabs of one browser. */
function environment() {
  const data = new Map<string, string>();
  let failWrite = false;
  let writes = 0;
  const tabs: { id: number; onStorage: (raw: string | null) => void }[] = [];
  const open = () => {
    const id = tabs.length;
    let status: SaveStatus = "ready";
    let memory: Desk = { notes: [] };
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, raw: string) => {
        if (failWrite) throw new Error("quota");
        const changed = data.get(key) !== raw;
        data.set(key, raw);
        writes++;
        // Browsers fire `storage` in the other tabs only, and only on a real change.
        if (changed && key === KEY) for (const tab of tabs) if (tab.id !== id) tab.onStorage(raw);
      },
      removeItem: (key: string) => {
        data.delete(key);
      },
    };
    const adapter = createDeskStorage<Desk>({
      storage,
      status: (s) => {
        status = s;
      },
    });
    // Minimal stand-in for the zustand store: every change is persisted via setItem.
    const set = (next: Desk) => {
      memory = next;
      adapter.storage.setItem(KEY, { state: next, version: 0 });
    };
    const hydrate = async () => {
      memory = (await adapter.storage.getItem(KEY))?.state ?? { notes: [] };
    };
    const add = (note: string) => set({ notes: [...memory.notes, note] });
    tabs.push({ id, onStorage: (raw) => adapter.syncFrom(raw, (v) => set(v.state)) });
    return { ...adapter, set, hydrate, add, memory: () => memory, status: () => status };
  };
  return {
    data,
    open,
    fail: (on: boolean) => {
      failWrite = on;
    },
    writes: () => writes,
  };
}

test("saves synchronously, including the last edit before closing", async () => {
  const env = environment();
  const tab = env.open();
  await tab.hydrate();
  tab.add("last edit");
  assert.deepEqual(saved(env.data), ["last edit"]);
  assert.equal(tab.status(), "ready");
});
test("two open tabs both save", async () => {
  const env = environment();
  const a = env.open();
  const b = env.open();
  await a.hydrate();
  await b.hydrate();
  a.add("A");
  assert.deepEqual(saved(env.data), ["A"]);
  b.add("B");
  assert.deepEqual(saved(env.data), ["A", "B"]);
  assert.equal(a.status(), "ready");
  assert.equal(b.status(), "ready");
});
test("tab B picks up tab A's write, and B's next edit keeps A's item", async () => {
  const env = environment();
  const a = env.open();
  const b = env.open();
  await a.hydrate();
  await b.hydrate();
  a.add("from A");
  assert.deepEqual(b.memory().notes, ["from A"]);
  b.add("from B");
  assert.deepEqual(saved(env.data), ["from A", "from B"]);
  assert.deepEqual(a.memory().notes, ["from A", "from B"]);
});
test("applying another tab's write never writes back (no ping-pong)", async () => {
  const env = environment();
  const a = env.open();
  const b = env.open();
  const c = env.open();
  await a.hydrate();
  await b.hydrate();
  await c.hydrate();
  const before = env.writes();
  a.add("one");
  assert.equal(env.writes() - before, 1);
  assert.deepEqual(c.memory().notes, ["one"]);
});
test("identical content is not rewritten", async () => {
  const env = environment();
  const tab = env.open();
  await tab.hydrate();
  tab.add("x");
  const before = env.writes();
  tab.set({ notes: ["x"] });
  assert.equal(env.writes(), before);
});
test("an edit made before hydration does not hide the saved desk or get written", async () => {
  const env = environment();
  env.data.set(KEY, JSON.stringify(value("saved")));
  const tab = env.open();
  tab.storage.setItem(KEY, value());
  assert.deepEqual(saved(env.data), ["saved"]);
  assert.deepEqual(await tab.storage.getItem(KEY), value("saved"));
  tab.storage.setItem(KEY, value("saved", "new"));
  assert.deepEqual(saved(env.data), ["saved", "new"]);
  assert.equal(tab.status(), "ready");
});
test("other tabs' writes are ignored before this tab hydrates", async () => {
  const env = environment();
  const a = env.open();
  const b = env.open();
  await a.hydrate();
  a.add("A");
  assert.deepEqual(b.memory().notes, []);
  await b.hydrate();
  assert.deepEqual(b.memory().notes, ["A"]);
});
test("removed or unreadable values from another tab are ignored", async () => {
  const env = environment();
  const tab = env.open();
  await tab.hydrate();
  tab.add("mine");
  assert.equal(
    tab.syncFrom(null, () => assert.fail("applied null")),
    false,
  );
  assert.equal(
    tab.syncFrom("{broken", () => assert.fail("applied junk")),
    false,
  );
  assert.deepEqual(tab.memory().notes, ["mine"]);
});
test("corrupt storage is preserved until explicit successful recovery, then edits save", async () => {
  const env = environment();
  env.data.set(KEY, "{broken");
  const tab = env.open();
  assert.equal(await tab.storage.getItem(KEY), null);
  assert.equal(tab.status(), "failed");
  tab.storage.setItem(KEY, value("while broken"));
  assert.equal(env.data.get(KEY), "{broken");
  assert.equal(await tab.replace(value("restored")), true);
  assert.equal([...env.data.keys()].filter((key) => key.startsWith(KEY + ":recovery:")).length, 1);
  assert.ok([...env.data.values()].map((raw) => unwrapRecoveryCopy(raw).raw).includes("{broken"));
  tab.storage.setItem(KEY, value("restored", "new"));
  assert.deepEqual(saved(env.data), ["restored", "new"]);
  assert.equal(tab.status(), "ready");
});
test("a corrupt-save hold ignores other tabs' writes and keeps blocking saves", async () => {
  const env = environment();
  env.data.set(KEY, "{broken");
  const held = env.open();
  await held.hydrate();
  assert.equal(
    held.syncFrom(JSON.stringify(value("elsewhere")), () => assert.fail("synced during hold")),
    false,
  );
  env.data.set(KEY, "{broken");
  held.add("blocked");
  assert.equal(env.data.get(KEY), "{broken");
  assert.equal(held.status(), "failed");
});
test("failed recovery does not erase the corrupt original or unblock automatic writes", async () => {
  const env = environment();
  env.data.set(KEY, "{broken");
  const tab = env.open();
  await tab.storage.getItem(KEY);
  env.fail(true);
  assert.equal(await tab.replace(value("restored")), false);
  env.fail(false);
  tab.storage.setItem(KEY, value("new"));
  assert.equal(env.data.get(KEY), "{broken");
});
test("quota failure retains pending edits and retries on the next edit", async () => {
  const env = environment();
  const tab = env.open();
  await tab.hydrate();
  env.fail(true);
  tab.storage.setItem(KEY, value("pending"));
  assert.equal(tab.status(), "failed");
  assert.deepEqual(await tab.storage.getItem(KEY), value("pending"));
  env.fail(false);
  tab.storage.setItem(KEY, value("pending", "next"));
  assert.equal(tab.status(), "ready");
  assert.deepEqual(saved(env.data), ["pending", "next"]);
});
test("a thrown first read is retried by the next save instead of latching", async () => {
  const data = new Map<string, string>([[KEY, JSON.stringify(value("saved"))]]);
  let throwOnce = true;
  let status: SaveStatus = "ready";
  let writes = 0;
  const adapter = createDeskStorage<Desk>({
    storage: {
      getItem: () => {
        if (throwOnce) {
          throwOnce = false;
          throw new Error("blocked once");
        }
        return data.get(KEY) ?? null;
      },
      setItem: (_key, raw) => {
        writes += 1;
        data.set(KEY, raw);
      },
      removeItem: (key) => {
        data.delete(key);
      },
    },
    status: (s) => {
      status = s;
    },
  });
  assert.equal(await adapter.storage.getItem(KEY), null);
  assert.equal(status, "failed", "the blocked read is visible");
  adapter.storage.setItem(KEY, value("new"));
  assert.equal(writes, 1, "the next save retries and writes");
  assert.equal(status, "ready");
  // The desk read on retry is not overwritten by the empty in-memory default.
  assert.deepEqual(new Set(saved(data)), new Set(["saved", "new"]));
});
test("no Web Locks needed: the adapter saves with plain localStorage", async () => {
  const env = environment();
  const tab = env.open();
  await tab.hydrate();
  tab.add("old browser");
  assert.deepEqual(saved(env.data), ["old browser"]);
  assert.equal(await tab.replace(value("import")), true);
  assert.deepEqual(saved(env.data), ["import"]);
});

/** Like `environment()`, but storage events are queued tasks, as in real browsers. */
function queuedEnvironment() {
  const data = new Map<string, string>();
  const queue: { to: number; raw: string }[] = [];
  const tabs: { receive: (raw: string) => void }[] = [];
  const open = () => {
    const id = tabs.length;
    let memory: Desk = { notes: [] };
    const adapter = createDeskStorage<Desk>({
      storage: {
        getItem: (key) => data.get(key) ?? null,
        setItem: (key, raw) => {
          const changed = data.get(key) !== raw;
          data.set(key, raw);
          if (changed)
            tabs.forEach((_, to) => {
              if (to !== id) queue.push({ to, raw });
            });
        },
        removeItem: (key) => {
          data.delete(key);
        },
      },
      status() {},
      merged: (v) => {
        memory = v.state as Desk;
      },
    });
    const set = (next: Desk) => {
      memory = next;
      adapter.storage.setItem(KEY, { state: next, version: 0 });
    };
    tabs.push({ receive: (raw) => adapter.syncFrom(raw, (v) => set(v.state)) });
    return {
      hydrate: async () => {
        memory = (await adapter.storage.getItem(KEY))?.state ?? { notes: [] };
      },
      add: (note: string) => set({ notes: [...memory.notes, note] }),
      remove: (note: string) => set({ notes: memory.notes.filter((n) => n !== note) }),
      memory: () => memory.notes,
    };
  };
  const deliver = () => {
    for (const e of queue.splice(0)) tabs[e.to].receive(e.raw);
  };
  return { data, open, deliver };
}

test("a late storage event never rolls back a newer save (audit 10-15 P1)", async () => {
  const env = queuedEnvironment();
  const a = env.open();
  const b = env.open();
  await a.hydrate();
  await b.hydrate();
  a.add("A");
  b.add("B"); // B saves before A's event arrives
  assert.deepEqual(saved(env.data), ["A", "B"]); // merged, not overwritten
  env.deliver();
  assert.deepEqual(a.memory(), ["A", "B"]);
  assert.deepEqual(b.memory(), ["A", "B"]);
  b.add("B later");
  env.deliver();
  assert.deepEqual(saved(env.data), ["A", "B", "B later"]);
  assert.deepEqual(a.memory(), ["A", "B", "B later"]);
});

test("interleaved deletes and adds across tabs keep every save", async () => {
  const env = queuedEnvironment();
  const a = env.open();
  const b = env.open();
  await a.hydrate();
  await b.hydrate();
  a.add("x");
  a.add("y");
  env.deliver();
  a.remove("x");
  b.add("z"); // B has not seen the delete yet
  env.deliver();
  assert.deepEqual(saved(env.data), ["y", "z"]);
  assert.deepEqual(a.memory(), ["y", "z"]);
  assert.deepEqual(b.memory(), ["y", "z"]);
});

test("old saves still load; the next save adds only the identity marker", async () => {
  const env = queuedEnvironment();
  env.data.set(KEY, JSON.stringify(value("old")));
  const a = env.open();
  await a.hydrate();
  assert.deepEqual(a.memory(), ["old"]);
  a.add("new");
  const written = JSON.parse(env.data.get(KEY)!);
  assert.deepEqual(Object.keys(written).sort(), ["identity", "state", "version"]);
  assert.equal(written.version, 0, "older builds, which check version 0, still load it");
  assert.equal(written.identity, 1);
});

test("a parsed save that would lose records is held, not overwritten (defect 3)", async () => {
  const data = new Map<string, string>();
  const bad = JSON.stringify({ state: { notes: ["keep", 7] }, version: 0 });
  data.set(KEY, bad);
  let status: SaveStatus = "ready";
  const adapter = createDeskStorage<Desk>({
    storage: {
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => {
        data.set(k, v);
      },
      removeItem: (k) => {
        data.delete(k);
      },
    },
    status: (s) => {
      status = s;
    },
    validate: (v) => (v as { state: Desk }).state.notes.every((n) => typeof n === "string"),
  });
  assert.equal(await adapter.storage.getItem(KEY), null);
  assert.equal(status, "failed");
  adapter.storage.setItem(KEY, { state: { notes: [] }, version: 0 });
  assert.equal(data.get(KEY), bad); // original untouched
  assert.equal(await adapter.replace({ state: { notes: ["restored"] }, version: 0 }), true);
  const archived = [...data.keys()].filter((k) => k.startsWith(`${KEY}:recovery:`));
  assert.equal(archived.length, 1);
  assert.equal(unwrapRecoveryCopy(data.get(archived[0])!).raw, bad);
});

test("malformed and unsupported saves are held even after a tab has hydrated", async (t) => {
  for (const bad of [
    "{broken",
    "null",
    "false",
    "0",
    '"text"',
    "[]",
    "{}",
    JSON.stringify({ state: null, version: 0 }),
    JSON.stringify({ state: [], version: 0 }),
    JSON.stringify({ state: { notes: ["future"] }, version: 1 }),
    JSON.stringify({ state: { notes: ["future"] }, version: "0" }),
  ]) {
    await t.test(bad, async () => {
      const env = environment();
      const tab = env.open();
      await tab.hydrate();
      env.data.set(KEY, bad); // a newer disk value before its storage event arrives
      tab.add("must not overwrite");
      assert.equal(env.data.get(KEY), bad);
      assert.equal(tab.status(), "failed");
      assert.equal(await tab.replace(value("restored")), true);
      const archives = [...env.data.keys()].filter((key) => key.startsWith(`${KEY}:recovery:`));
      assert.equal(archives.length, 1);
      assert.equal(unwrapRecoveryCopy(env.data.get(archives[0])!).raw, bad);
      tab.storage.setItem(KEY, value("restored", "new"));
      assert.deepEqual(saved(env.data), ["restored", "new"]);
    });
  }
});

test("initial invalid JSON values and unknown versions cannot be overwritten by hydration", async () => {
  for (const bad of [
    "null",
    "false",
    "0",
    "[]",
    "{}",
    JSON.stringify({ ...value("future"), version: 1 }),
  ]) {
    const env = environment();
    env.data.set(KEY, bad);
    const tab = env.open();
    assert.equal(await tab.storage.getItem(KEY), null);
    tab.storage.setItem(KEY, value());
    assert.equal(env.data.get(KEY), bad);
    assert.equal(tab.status(), "failed");
  }
});

test("a corrupt storage event enters the same recovery hold instead of reporting ready", async () => {
  const env = environment();
  const tab = env.open();
  await tab.hydrate();
  env.data.set(KEY, "{broken");
  assert.equal(
    tab.syncFrom("{broken", () => assert.fail("applied corrupt save")),
    false,
  );
  assert.equal(tab.status(), "failed");
  tab.add("still held");
  assert.equal(env.data.get(KEY), "{broken");
});

test("legacy saves without a version are normalized and still merge with version zero", async () => {
  const env = environment();
  env.data.set(KEY, JSON.stringify({ state: { notes: ["legacy"] } }));
  const tab = env.open();
  await tab.hydrate();
  tab.add("mine");
  assert.deepEqual(saved(env.data), ["legacy", "mine"]);
  assert.equal(JSON.parse(env.data.get(KEY)!).version, 0);
  assert.equal(tab.status(), "ready");
});

test("a failed disk read never applies the storage event's possibly stale value", async () => {
  let failRead = false;
  let raw = JSON.stringify(value("newest"));
  let status: SaveStatus = "ready";
  const tab = createDeskStorage<Desk>({
    storage: {
      getItem() {
        if (failRead) throw new Error("blocked");
        return raw;
      },
      setItem(_key, next) {
        raw = next;
      },
      removeItem() {},
    },
    status: (next) => {
      status = next;
    },
  });
  await tab.storage.getItem(KEY);
  failRead = true;
  assert.equal(
    tab.syncFrom(JSON.stringify(value("old event")), () => assert.fail("rolled back")),
    false,
  );
  assert.equal(status, "failed");
  failRead = false;
  tab.storage.setItem(KEY, value("newest", "edit"));
  assert.deepEqual(JSON.parse(raw).state.notes, ["newest", "edit"]);
  assert.equal(status, "ready");
});

test("explicit import archives a newer corrupt save even before its storage event arrives", async () => {
  for (const original of ["{unreadable", JSON.stringify({ ...value("future"), version: 1 })]) {
    const env = environment();
    const tab = env.open();
    await tab.hydrate();
    env.data.set(KEY, original);
    assert.equal(await tab.replace(value("imported")), true);
    const archives = [...env.data.keys()].filter((key) => key.startsWith(`${KEY}:recovery:`));
    assert.equal(archives.length, 1);
    assert.equal(unwrapRecoveryCopy(env.data.get(archives[0])!).raw, original);
    assert.equal(unwrapRecoveryCopy(env.data.get(archives[0])!).source, "unreadable");
    assert.deepEqual(saved(env.data), ["imported"]);
  }
});

/** A Web Locks stand-in: one holder at a time, callbacks run when `release()` is called. */
function fakeLocks() {
  const waiting: { name: string; run: () => void }[] = [];
  const names: string[] = [];
  let held = false;
  const next = () => {
    if (held) return;
    const item = waiting.shift();
    if (!item) return;
    held = true;
    try {
      item.run();
    } finally {
      held = false;
    }
    next();
  };
  return {
    names,
    hold: () => {
      held = true;
    },
    release: () => {
      held = false;
      next();
    },
    request(name: string, callback: () => unknown) {
      names.push(name);
      return new Promise<unknown>((resolve) => {
        waiting.push({ name, run: () => resolve(callback()) });
        next();
      });
    },
  };
}

test("with Web Locks, the read–merge–write runs inside one shared lock (audit: lost saves)", async () => {
  const { DESK_SAVE_LOCK } = await import("./desk-storage.ts");
  const data = new Map<string, string>();
  const locks = fakeLocks();
  const adapter = createDeskStorage<Desk>({
    storage: {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, raw) => void data.set(key, raw),
      removeItem: (key) => void data.delete(key),
    },
    status() {},
    locks,
  });
  await adapter.storage.getItem(KEY);
  // Another tab holds the lock and is mid-save: this tab's edits must wait.
  locks.hold();
  adapter.storage.setItem(KEY, value("mine 1"));
  adapter.storage.setItem(KEY, value("mine 1", "mine 2"));
  assert.equal(data.get(KEY), undefined, "nothing is read or written without the lock");
  // The other tab finishes its write, then releases the lock.
  data.set(KEY, disk("theirs"));
  locks.release();
  assert.deepEqual(new Set(saved(data)), new Set(["theirs", "mine 1", "mine 2"]));
  assert.ok(locks.names.length >= 1);
  assert.ok(locks.names.every((name) => name === DESK_SAVE_LOCK));
});

test("with Web Locks, two tabs saving at once keep both edits", async () => {
  const data = new Map<string, string>();
  const locks = fakeLocks();
  const tab = () =>
    createDeskStorage<Desk>({
      storage: {
        getItem: (key) => data.get(key) ?? null,
        setItem: (key, raw) => void data.set(key, raw),
        removeItem: (key) => void data.delete(key),
      },
      status() {},
      locks,
    });
  const a = tab();
  const b = tab();
  await a.storage.getItem(KEY);
  await b.storage.getItem(KEY);
  locks.hold();
  // Both tabs saw the same (empty) disk and saved at the same moment.
  a.storage.setItem(KEY, value("A"));
  b.storage.setItem(KEY, value("B"));
  locks.release();
  assert.deepEqual(new Set(saved(data)), new Set(["A", "B"]));
});

test("a lock request that fails still saves, and a queued save is written on page hide", async () => {
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, raw: string) => void data.set(key, raw),
    removeItem: (key: string) => void data.delete(key),
  };
  const broken = createDeskStorage<Desk>({
    storage,
    status() {},
    locks: {
      request: () => {
        throw new Error("SecurityError");
      },
    },
  });
  await broken.storage.getItem(KEY);
  broken.storage.setItem(KEY, value("saved anyway"));
  assert.deepEqual(saved(data), ["saved anyway"]);

  const locks = fakeLocks();
  const waiting = createDeskStorage<Desk>({ storage, status() {}, locks });
  await waiting.storage.getItem(KEY);
  locks.hold();
  waiting.storage.setItem(KEY, value("saved anyway", "last edit"));
  waiting.flushBeforeUnload();
  assert.deepEqual(saved(data), ["saved anyway", "last edit"]);
  locks.release();
  assert.deepEqual(saved(data), ["saved anyway", "last edit"], "no second, stale write");
});

test("without Web Locks, a racing save that drops this tab's write leaves a recovery copy", async () => {
  let clock = 1_000;
  const recoveries = (data: Map<string, string>) =>
    [...data.keys()].filter((key) => key.startsWith(`${KEY}:recovery:`));
  const run = async (delay: number, theirs: string[]) => {
    clock = 1_000;
    const data = new Map<string, string>([[KEY, JSON.stringify(value("start"))]]);
    const adapter = createDeskStorage<Desk>({
      storage: {
        getItem: (key) => data.get(key) ?? null,
        setItem: (key, raw) => void data.set(key, raw),
        removeItem: (key) => void data.delete(key),
      },
      status() {},
      now: () => clock,
    });
    await adapter.storage.getItem(KEY);
    adapter.storage.setItem(KEY, value("start", "mine"));
    // The other tab read "start" before this write and saved over it.
    clock += delay;
    const raw = disk(...theirs);
    data.set(KEY, raw);
    let shown: string[] = [];
    adapter.syncFrom(raw, (v) => {
      shown = v.state.notes;
    });
    return { data, shown, copies: recoveries(data) };
  };
  const lost = await run(50, ["start", "theirs"]);
  assert.deepEqual(lost.shown, ["start", "theirs"], "the newer save is shown");
  assert.equal(lost.copies.length, 1, "this tab's write is kept, not silently dropped");
  const copy = unwrapRecoveryCopy(lost.data.get(lost.copies[0])!);
  assert.deepEqual(JSON.parse(copy.raw).state.notes, ["start", "mine"]);
  assert.equal(copy.source, "conflict");
  assert.equal(copy.createdAt, new Date(1_050).toISOString(), "the copy records when it was made");
  // The other tab had already merged this write: nothing was lost, no copy.
  assert.equal((await run(50, ["start", "mine", "theirs"])).copies.length, 0);
  // Long after this tab's write, a different save is ordinary editing, not a race.
  assert.equal((await run(10_000, ["start", "theirs"])).copies.length, 0);
});

test("recovery copies carry their time and reason; bare copies from older builds still read", () => {
  const raw = JSON.stringify(value("kept"));
  const wrapped = wrapRecoveryCopy(raw, "old-tab", new Date("2026-11-20T18:00:00.000Z"));
  assert.deepEqual(unwrapRecoveryCopy(wrapped), {
    createdAt: "2026-11-20T18:00:00.000Z",
    source: "old-tab",
    raw,
  });
  // Written before metadata existed: the bare save, or unreadable bytes.
  assert.deepEqual(unwrapRecoveryCopy(raw), { createdAt: null, source: "unknown", raw });
  assert.deepEqual(unwrapRecoveryCopy("{broken"), {
    createdAt: null,
    source: "unknown",
    raw: "{broken",
  });
  // A damaged envelope keeps its bytes; unknown fields do not invent a time or reason.
  const odd = JSON.stringify({ eugeneDeskRecovery: 1, createdAt: "soon", source: "x", raw });
  assert.deepEqual(unwrapRecoveryCopy(odd), { createdAt: null, source: "unknown", raw });
});

/** One tab's adapter on a shared Map, recording conflicts and recovery copies. */
function identityTab<S>(data: Map<string, string>, normalize?: (state: S) => S) {
  const conflicts: (string | null)[] = [];
  let status: SaveStatus = "ready";
  const adapter = createDeskStorage<S>({
    storage: {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, raw) => void data.set(key, raw),
      removeItem: (key) => void data.delete(key),
    },
    status: (next) => {
      status = next;
    },
    conflict: (kind) => void conflicts.push(kind),
    normalize,
  });
  const copies = () =>
    [...data.keys()]
      .filter((key) => key.startsWith(`${KEY}:recovery:`))
      .map((key) => unwrapRecoveryCopy(data.get(key)!));
  return { adapter, conflicts, copies, status: () => status };
}

test("an older version saving in another tab pauses saving here and keeps this tab's desk", async () => {
  const data = new Map<string, string>([[KEY, disk("start")]]);
  const tab = identityTab<Desk>(data);
  await tab.adapter.storage.getItem(KEY);
  tab.adapter.storage.setItem(KEY, value("start", "mine"));
  assert.equal(JSON.parse(data.get(KEY)!).identity, 1, "this build marks its saves");
  // The old build in another tab loaded "start" and saved without the marker.
  const old = JSON.stringify(value("start", "old tab"));
  data.set(KEY, old);
  let applied = false;
  assert.equal(
    tab.adapter.syncFrom(old, () => {
      applied = true;
    }),
    false,
  );
  assert.equal(applied, false, "the old tab's save is not merged into this tab");
  assert.deepEqual(tab.conflicts, ["old-tab"]);
  assert.equal(tab.adapter.conflict(), "old-tab");
  const [copy] = tab.copies();
  assert.equal(copy.source, "old-tab");
  assert.deepEqual(JSON.parse(copy.raw).state.notes, ["start", "mine"], "this tab's desk is kept");
  assert.ok(copy.createdAt);
  // Paused: later edits and the pagehide flush write nothing.
  tab.adapter.storage.setItem(KEY, value("start", "mine", "more"));
  tab.adapter.flushBeforeUnload();
  assert.equal(data.get(KEY), old, "neither version overwrites the other");
  assert.equal(
    tab.adapter.syncFrom(old, () => assert.fail("synced while paused")),
    false,
  );
  // Only an explicit import or restore resumes saving.
  assert.equal(await tab.adapter.replace(value("restored")), true);
  assert.deepEqual(tab.conflicts, ["old-tab", null]);
  assert.deepEqual(saved(data), ["restored"]);
});

test("an older version's save found before its storage event also pauses the next save", async () => {
  const data = new Map<string, string>([[KEY, disk("start")]]);
  const tab = identityTab<Desk>(data);
  await tab.adapter.storage.getItem(KEY);
  const old = JSON.stringify(value("start", "old tab"));
  data.set(KEY, old);
  tab.adapter.storage.setItem(KEY, value("start", "mine"));
  assert.equal(data.get(KEY), old);
  assert.deepEqual(tab.conflicts, ["old-tab"]);
  assert.deepEqual(JSON.parse(tab.copies()[0].raw).state.notes, ["start", "mine"]);
});

type Row = { id: string; text: string };
type RowsDesk = { notes: Row[] };
const rowsSave = (notes: [string, string][], identity?: number) =>
  JSON.stringify({
    state: { notes: notes.map(([id, text]) => ({ id, text })) },
    version: 0,
    ...(identity === undefined ? {} : { identity }),
  });

test("an old save with repeated or blank ids is migrated once and written with the marker", async () => {
  const { withStableIds } = await import("./desk-records.ts");
  const data = new Map<string, string>([
    [
      KEY,
      rowsSave([
        ["x", "A"],
        ["x", "B"],
        ["", "C"],
      ]),
    ],
  ]);
  const tab = identityTab<RowsDesk>(data, withStableIds);
  const loaded = await tab.adapter.storage.getItem(KEY);
  assert.deepEqual(
    loaded?.state.notes.map((row) => row.id),
    ["x", "x~1", "row~1"],
  );
  assert.deepEqual(tab.conflicts, [], "an unmarked save is the one expected migration");
  tab.adapter.storage.setItem(KEY, loaded!);
  const written = JSON.parse(data.get(KEY)!);
  assert.equal(written.identity, 1);
  assert.deepEqual(
    written.state.notes.map((row: Row) => row.id),
    ["x", "x~1", "row~1"],
  );
  // A second tab reading the migrated save changes nothing and sees no conflict.
  const second = identityTab<RowsDesk>(data, withStableIds);
  const again = await second.adapter.storage.getItem(KEY);
  assert.deepEqual(again?.state, written.state);
  assert.deepEqual(second.conflicts, []);
});

test("a marked save whose ids would change again is a conflict, repaired only on request", async () => {
  const { withStableIds } = await import("./desk-records.ts");
  const raw = rowsSave(
    [
      ["x", "A"],
      ["x", "B"],
    ],
    1,
  );
  const data = new Map<string, string>([[KEY, raw]]);
  const tab = identityTab<RowsDesk>(data, withStableIds);
  const loaded = await tab.adapter.storage.getItem(KEY);
  assert.deepEqual(
    loaded?.state.notes.map((row) => row.id),
    ["x", "x~1"],
    "the desk is shown with repaired ids",
  );
  assert.deepEqual(tab.conflicts, ["identity"]);
  assert.equal(tab.copies()[0].source, "identity");
  assert.equal(tab.copies()[0].raw, raw, "the original save is kept verbatim");
  tab.adapter.storage.setItem(KEY, loaded!);
  assert.equal(data.get(KEY), raw, "no automatic overwrite");
  assert.equal(await tab.adapter.repairIdentity(), true);
  assert.deepEqual(tab.conflicts, ["identity", null]);
  const written = JSON.parse(data.get(KEY)!);
  assert.deepEqual(
    written.state.notes.map((row: Row) => row.id),
    ["x", "x~1"],
  );
  assert.equal(written.identity, 1);
  assert.equal(await tab.adapter.repairIdentity(), false, "nothing left to repair");
});

test("a save from a newer identity scheme is held like a newer version", async () => {
  const raw = JSON.stringify({ ...value("future"), identity: 2 });
  const data = new Map<string, string>([[KEY, raw]]);
  const tab = identityTab<Desk>(data);
  assert.equal(await tab.adapter.storage.getItem(KEY), null);
  assert.equal(tab.status(), "failed");
  tab.adapter.storage.setItem(KEY, value("mine"));
  assert.equal(data.get(KEY), raw);
});

// Audit 2026-11-27 P1-02: a conflict that arrives from another tab must be repairable.
function lockedIdentityTab(data: Map<string, string>, failWrites: { on: boolean }) {
  const conflicts: (string | null)[] = [];
  const lockNames: string[] = [];
  let status: SaveStatus = "ready";
  let shown: RowsDesk | null = null;
  const adapter = createDeskStorage<RowsDesk>({
    storage: {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, raw) => {
        if (failWrites.on && key === KEY) throw new Error("quota");
        data.set(key, raw);
      },
      removeItem: (key) => void data.delete(key),
    },
    status: (next) => {
      status = next;
    },
    conflict: (kind) => void conflicts.push(kind),
    locks: {
      request: async (name, callback) => {
        lockNames.push(name);
        return callback();
      },
    },
    normalize: (state) => {
      const ids = new Map<string, number>();
      let changed = false;
      const notes = state.notes.map((row) => {
        const n = ids.get(row.id) ?? 0;
        ids.set(row.id, n + 1);
        if (n === 0) return row;
        changed = true;
        return { ...row, id: `${row.id}~${n}` };
      });
      return changed ? { notes } : state;
    },
  });
  const copies = () =>
    [...data.keys()]
      .filter((key) => key.startsWith(`${KEY}:recovery:`))
      .map((key) => unwrapRecoveryCopy(data.get(key)!));
  const apply = (v: { state: RowsDesk }) => {
    shown = v.state;
  };
  return { adapter, conflicts, copies, lockNames, apply, shown: () => shown, status: () => status };
}
const ids = (raw: string | undefined) => JSON.parse(raw!).state.notes.map((row: Row) => row.id);

test("P1-02: a duplicate-id save from another tab is repaired on disk and saving resumes", async () => {
  const data = new Map<string, string>([[KEY, rowsSave([["a", "A"]], 1)]]);
  const tab = lockedIdentityTab(data, { on: false });
  await tab.adapter.storage.getItem(KEY);
  const dup = rowsSave(
    [
      ["x", "A"],
      ["x", "B"],
    ],
    1,
  );
  data.set(KEY, dup);
  assert.equal(tab.adapter.syncFrom(dup, tab.apply), false);
  assert.equal(tab.adapter.conflict(), "identity");
  assert.equal(tab.copies().length, 1);
  assert.equal(await tab.adapter.repairIdentity(tab.apply), true);
  assert.equal(tab.adapter.conflict(), null, "the pause is really over");
  assert.deepEqual(ids(data.get(KEY)), ["x", "x~1"], "the repaired ids are on disk");
  assert.equal(tab.copies().length, 1, "the original is archived once, not again");
  assert.ok(tab.lockNames.includes("13th-desk-v1:save"), "repair runs under the save lock");
  assert.deepEqual(tab.conflicts, ["identity", null]);
  // Normal saving works again.
  tab.adapter.storage.setItem(KEY, {
    state: {
      notes: [
        { id: "x", text: "A" },
        { id: "x~1", text: "B" },
        { id: "n", text: "new" },
      ],
    },
    version: 0,
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(ids(data.get(KEY)), ["x", "x~1", "n"]);
  assert.equal(tab.adapter.conflict(), null);
});

test("P1-02: edits made during the pause are merged into the repaired desk", async () => {
  const data = new Map<string, string>([[KEY, rowsSave([["a", "A"]], 1)]]);
  const tab = lockedIdentityTab(data, { on: false });
  await tab.adapter.storage.getItem(KEY);
  const dup = rowsSave(
    [
      ["a", "A"],
      ["x", "B"],
      ["x", "C"],
    ],
    1,
  );
  data.set(KEY, dup);
  tab.adapter.syncFrom(dup, tab.apply);
  tab.adapter.storage.setItem(KEY, {
    state: {
      notes: [
        { id: "a", text: "A" },
        { id: "mine", text: "mine" },
      ],
    },
    version: 0,
  });
  assert.equal(data.get(KEY), dup, "paused: nothing written yet");
  assert.equal(await tab.adapter.repairIdentity(tab.apply), true);
  assert.deepEqual(ids(data.get(KEY)).sort(), ["a", "mine", "x", "x~1"]);
  assert.deepEqual(
    tab
      .shown()
      ?.notes.map((row) => row.id)
      .sort(),
    ["a", "mine", "x", "x~1"],
  );
});

test("P1-02: a newer write during the pause is classified again, never overwritten", async () => {
  const data = new Map<string, string>([[KEY, rowsSave([["a", "A"]], 1)]]);
  const tab = lockedIdentityTab(data, { on: false });
  await tab.adapter.storage.getItem(KEY);
  const dup = rowsSave(
    [
      ["x", "A"],
      ["x", "B"],
    ],
    1,
  );
  data.set(KEY, dup);
  tab.adapter.syncFrom(dup, tab.apply);
  // Another untrusted save lands while the notice is up.
  const dup2 = rowsSave(
    [
      ["y", "C"],
      ["y", "D"],
    ],
    1,
  );
  data.set(KEY, dup2);
  assert.equal(await tab.adapter.repairIdentity(tab.apply), false, "not a silent success");
  assert.equal(tab.adapter.conflict(), "identity");
  assert.equal(data.get(KEY), dup2, "the newer save is not overwritten");
  assert.equal(tab.copies().length, 2, "the newer original is kept too");
  // Repairing again now writes the newer value's repair.
  assert.equal(await tab.adapter.repairIdentity(tab.apply), true);
  assert.deepEqual(ids(data.get(KEY)), ["y", "y~1"]);
  assert.equal(tab.copies().length, 2);

  // A clean save from this build during a pause is kept as is.
  const data2 = new Map<string, string>([[KEY, rowsSave([["a", "A"]], 1)]]);
  const other = lockedIdentityTab(data2, { on: false });
  await other.adapter.storage.getItem(KEY);
  data2.set(KEY, dup);
  other.adapter.syncFrom(dup, other.apply);
  const clean = rowsSave(
    [
      ["x", "A"],
      ["z", "B"],
    ],
    1,
  );
  data2.set(KEY, clean);
  assert.equal(await other.adapter.repairIdentity(other.apply), true);
  assert.equal(data2.get(KEY), clean);
  assert.equal(other.adapter.conflict(), null);
});

test("P1-02: a failed repair write keeps the pause and reports failure", async () => {
  const data = new Map<string, string>([[KEY, rowsSave([["a", "A"]], 1)]]);
  const failing = { on: false };
  const tab = lockedIdentityTab(data, failing);
  await tab.adapter.storage.getItem(KEY);
  const dup = rowsSave(
    [
      ["x", "A"],
      ["x", "B"],
    ],
    1,
  );
  data.set(KEY, dup);
  tab.adapter.syncFrom(dup, tab.apply);
  failing.on = true;
  assert.equal(await tab.adapter.repairIdentity(tab.apply), false);
  assert.equal(tab.adapter.conflict(), "identity");
  assert.equal(tab.status(), "failed");
  assert.equal(data.get(KEY), dup);
  failing.on = false;
  assert.equal(await tab.adapter.repairIdentity(tab.apply), true);
  assert.deepEqual(ids(data.get(KEY)), ["x", "x~1"]);
  assert.equal(tab.copies().length, 1);
});
