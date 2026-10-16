import { test } from "node:test";
import assert from "node:assert/strict";
import { createDeskStorage, type SaveStatus } from "./desk-storage.ts";

const KEY = "13th-desk-v1";
type Desk = { notes: string[] };
const value = (...notes: string[]) => ({ state: { notes }, version: 0 });
const saved = (data: Map<string, string>) => JSON.parse(data.get(KEY)!).state.notes;

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
  assert.ok([...env.data.values()].includes("{broken"));
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

test("old saves without any new field still load and save unchanged", async () => {
  const env = queuedEnvironment();
  env.data.set(KEY, JSON.stringify(value("old")));
  const a = env.open();
  await a.hydrate();
  assert.deepEqual(a.memory(), ["old"]);
  a.add("new");
  assert.deepEqual(Object.keys(JSON.parse(env.data.get(KEY)!)).sort(), ["state", "version"]);
  assert.equal(JSON.parse(env.data.get(KEY)!).version, 0);
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
  assert.equal(data.get(archived[0]), bad);
});
