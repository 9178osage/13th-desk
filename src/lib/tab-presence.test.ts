import { test } from "node:test";
import assert from "node:assert/strict";
import { createTabPresence, PRESENCE_EXPIRE_MS } from "./tab-presence.ts";

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 5));

/** In-memory BroadcastChannel: delivers to every other member. */
function bus() {
  const members = new Set<{ listener?: (event: { data: unknown }) => void }>();
  return () => {
    const member: { listener?: (event: { data: unknown }) => void } = {};
    members.add(member);
    return {
      postMessage(data: unknown) {
        for (const other of members) if (other !== member) queueMicrotask(() => other.listener?.({ data }));
      },
      addEventListener(_type: "message", listener: (event: { data: unknown }) => void) { member.listener = listener; },
      close() { members.delete(member); },
    };
  };
}

/** Minimal LockManager: exclusive named locks held until the callback settles. */
function lockManager() {
  const held = new Set<string>();
  return {
    request: (async (name: string, callback: () => Promise<void>) => {
      held.add(name);
      try { await callback(); } finally { held.delete(name); }
    }) as unknown as LockManager["request"],
    query: async () => ({ held: [...held].map((name) => ({ name })), pending: [] }),
  };
}

function tab(id: string, opts: { channel?: ReturnType<ReturnType<typeof bus>>; locks?: ReturnType<typeof lockManager>; now?: () => number }) {
  let others = false;
  const presence = createTabPresence({ id, channel: opts.channel, locks: opts.locks, now: opts.now, onChange: (v) => { others = v; } });
  return { presence, others: () => others };
}

test("BroadcastChannel: both tabs see each other; closing one clears the notice", async () => {
  const join = bus();
  const a = tab("a", { channel: join() }); await tick();
  assert.equal(a.others(), false);
  const b = tab("b", { channel: join() }); await tick();
  assert.equal(a.others(), true); assert.equal(b.others(), true);
  b.presence.dispose(); await tick();
  assert.equal(a.others(), false);
  a.presence.dispose();
});
test("BroadcastChannel: a tab that vanished without saying bye expires", async () => {
  const join = bus(); let t = 1_000;
  const a = tab("a", { channel: join(), now: () => t });
  const ghost = join(); ghost.postMessage({ type: "here", id: "ghost" }); await tick();
  assert.equal(a.others(), true);
  t += PRESENCE_EXPIRE_MS + 1; a.presence.refresh(); await tick();
  assert.equal(a.others(), false);
  a.presence.dispose();
});
test("Web Locks query: counts other tabs exactly and clears when one closes", async () => {
  const join = bus(); const locks = lockManager();
  const a = tab("a", { channel: join(), locks }); await tick();
  assert.equal(a.others(), false);
  const b = tab("b", { channel: join(), locks }); await tick();
  assert.equal(a.others(), true); assert.equal(b.others(), true);
  b.presence.dispose(); await new Promise((r) => setTimeout(r, 350));
  assert.equal(a.others(), false);
  a.presence.dispose();
});
test("Web Locks query: a new tab whose lock lands after its hello is still noticed", async () => {
  const join = bus(); const locks = lockManager();
  const a = tab("a", { channel: join(), locks }); await tick();
  const late = join(); late.postMessage({ type: "hello", id: "late" }); await tick();
  assert.equal(a.others(), false);
  void locks.request("13th-desk-v1:tab:late", () => new Promise<void>(() => {}));
  await new Promise((r) => setTimeout(r, 350));
  assert.equal(a.others(), true);
  a.presence.dispose();
});
test("no BroadcastChannel and no Web Locks: never warns, never throws", async () => {
  const a = tab("a", {}); await tick();
  assert.equal(a.others(), false);
  a.presence.wake(); a.presence.leave(); a.presence.dispose();
});
