import { test } from "node:test";
import assert from "node:assert/strict";
import { createDeskStorage, type SaveStatus } from "./desk-storage.ts";

const KEY = "13th-desk-v1";
type Desk = { notes: string[] };
const value = (...notes: string[]) => ({ state: { notes }, version: 0 });
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
function environment() {
  const data = new Map<string, string>();
  let held = false;
  let failWrite = false;
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, raw: string) => {
      if (failWrite) throw new Error("quota");
      data.set(key, raw);
    },
    removeItem: (key: string) => { data.delete(key); },
  };
  const locks = { request: async (_name: string, _options: unknown, callback: (lock: object | null) => Promise<void>) => {
    if (held) return callback(null);
    held = true;
    try { await callback({}); } finally { held = false; }
  } } as unknown as Pick<LockManager, "request">;
  const open = () => {
    let status: SaveStatus = "ready";
    const adapter = createDeskStorage<Desk>({ storage, locks, status: (s) => { status = s; } });
    return { ...adapter, status: () => status };
  };
  return { data, storage, locks, open, fail: (on: boolean) => { failWrite = on; } };
}

test("writer saves synchronously, including the last edit before closing", async () => {
  const env = environment(); const tab = env.open();
  await tick(); tab.storage.getItem(KEY);
  tab.storage.setItem(KEY, value("last edit"));
  assert.deepEqual(JSON.parse(env.data.get(KEY)!).state.notes, ["last edit"]);
  assert.equal(tab.status(), "ready"); tab.dispose();
});
test("a second tab cannot overwrite the writer or import over it", async () => {
  const env = environment(); const a = env.open(); const b = env.open();
  await tick(); a.storage.getItem(KEY); b.storage.getItem(KEY);
  a.storage.setItem(KEY, value("A")); b.storage.setItem(KEY, value("B"));
  assert.equal(b.status(), "conflict");
  assert.equal(await b.replace(value("import B")), false);
  assert.deepEqual(JSON.parse(env.data.get(KEY)!).state.notes, ["A"]);
  assert.deepEqual(await b.storage.getItem(KEY), value("B"));
  a.dispose(); b.dispose();
});
test("after closing the writer, a newly opened tab can save the latest desk", async () => {
  const env = environment(); const a = env.open(); await tick();
  a.storage.getItem(KEY); a.storage.setItem(KEY, value("A")); a.dispose(); await tick();
  const b = env.open(); await tick();
  assert.deepEqual(await b.storage.getItem(KEY), value("A"));
  b.storage.setItem(KEY, value("A", "B"));
  assert.deepEqual(JSON.parse(env.data.get(KEY)!).state.notes, ["A", "B"]); b.dispose();
});
test("corrupt storage is preserved until explicit successful recovery, then edits save", async () => {
  const env = environment(); env.data.set(KEY, "{broken"); const tab = env.open(); await tick();
  assert.equal(await tab.storage.getItem(KEY), null);
  tab.storage.setItem(KEY, value()); assert.equal(env.data.get(KEY), "{broken");
  assert.equal(await tab.replace(value("restored")), true);
  assert.equal([...env.data.entries()].filter(([key]) => key.startsWith(KEY + ":recovery:")).length, 1);
  assert.ok([...env.data.values()].includes("{broken"));
  tab.storage.setItem(KEY, value("restored", "new"));
  assert.deepEqual(JSON.parse(env.data.get(KEY)!).state.notes, ["restored", "new"]);
  assert.equal(tab.status(), "ready"); tab.dispose();
});
test("failed recovery does not erase the corrupt original or unblock automatic writes", async () => {
  const env = environment(); env.data.set(KEY, "{broken"); const tab = env.open(); await tick();
  tab.storage.getItem(KEY); env.fail(true);
  assert.equal(await tab.replace(value("restored")), false);
  env.fail(false); tab.storage.setItem(KEY, value("new"));
  assert.equal(env.data.get(KEY), "{broken"); tab.dispose();
});
test("an external legacy writer is detected even while holding the new lock", async () => {
  const env = environment(); const tab = env.open(); await tick(); tab.storage.getItem(KEY);
  env.data.set(KEY, JSON.stringify(value("external")));
  tab.storage.setItem(KEY, value("stale"));
  assert.equal(tab.status(), "conflict");
  assert.equal(await tab.replace(value("stale import")), false);
  assert.deepEqual(JSON.parse(env.data.get(KEY)!).state.notes, ["external"]); tab.dispose();
});
test("quota failure retains pending edits and retries on the next edit", async () => {
  const env = environment(); const tab = env.open(); await tick(); tab.storage.getItem(KEY);
  env.fail(true); tab.storage.setItem(KEY, value("pending"));
  assert.equal(tab.status(), "failed");
  assert.deepEqual(await tab.storage.getItem(KEY), value("pending"));
  env.fail(false); tab.storage.setItem(KEY, value("pending", "next"));
  assert.equal(tab.status(), "ready"); tab.dispose();
});
test("without Web Locks, fail closed instead of racing other tabs", async () => {
  const env = environment(); let status: SaveStatus = "ready";
  const tab = createDeskStorage<Desk>({ storage: env.storage, status: (s) => { status = s; } });
  tab.storage.getItem(KEY); tab.storage.setItem(KEY, value("unsaved"));
  assert.equal(status, "unsupported"); assert.equal(env.data.has(KEY), false);
  assert.equal(await tab.replace(value("import")), false); tab.dispose();
});
