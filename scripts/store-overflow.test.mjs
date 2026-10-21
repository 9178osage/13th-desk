// Exercise the unchanged app store API, not a simplified copy of its merge.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { rolldown } from "rolldown";

test("real store preserves merged overflow through edits, reload, export and restore", async (t) => {
  const key = "13th-desk-v1";
  const data = new Map();
  const handlers = new Map();
  Object.assign(globalThis, {
    localStorage: {
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => data.set(k, v),
      removeItem: (k) => data.delete(k),
    },
    window: {
      addEventListener(k, fn) {
        handlers.set(k, fn);
      },
      removeEventListener() {},
      setInterval() {
        return 0;
      },
      clearInterval() {},
    },
    document: {
      cookie: "",
      getElementById() {
        return null;
      },
      addEventListener() {},
      removeEventListener() {},
      visibilityState: "hidden",
    },
    location: { protocol: "https:" },
    BroadcastChannel: undefined,
  });
  const bundle = await rolldown({
    input: "src/lib/store.ts",
    platform: "node",
    tsconfig: "tsconfig.json",
    resolve: { alias: { "@": process.cwd() + "/src" } },
    transform: { define: { "import.meta.hot": "undefined" } },
  });
  const result = await bundle.generate({ format: "cjs", codeSplitting: false });
  await bundle.close();
  const module = { exports: {} };
  new Function("require", "module", "exports", result.output.find((x) => x.type === "chunk").code)(
    createRequire(import.meta.url),
    module,
    module.exports,
  );
  const {
    useDesk,
    ensureDeskHydrated,
    getPersistedDeskState,
    replacePersistedDeskState,
    useStorageStatus,
  } = module.exports;
  const { parseDeskBackup, serializeDeskBackup } = await import("../src/lib/desk-backup.ts");
  const { DESK_LIMITS, hasDeskOverflow } = await import("../src/lib/desk-limits.ts");
  await ensureDeskHydrated();
  const empty = getPersistedDeskState();
  const make = (kind, id) => {
    if (kind === "notes") return { id, text: id, done: false };
    if (kind === "grades") return { id, title: id, grade: "A", credits: 0.5, boost: false };
    if (kind === "schedule")
      return { id, title: id, day: "mon", start: "09:00", end: "10:00", place: "", pinned: false };
    return id;
  };
  for (const kind of Object.keys(DESK_LIMITS))
    await t.test(kind, async () => {
      const base = structuredClone(empty);
      base.buckets.uni[kind] = Array.from({ length: DESK_LIMITS[kind] - 1 }, (_, i) =>
        make(kind, "base-" + i),
      );
      assert.equal(await replacePersistedDeskState(base), true);
      const theirs = structuredClone(base);
      theirs.buckets.uni[kind].push(make(kind, "other-tab"));
      data.set(key, JSON.stringify({ state: theirs, version: 0 })); // queued event, not delivered
      const api = useDesk.getState();
      if (kind === "notes") assert.equal(api.addNote("my-tab"), true);
      if (kind === "grades")
        api.addGrade({ title: "my-tab", credits: 0.5, grade: "A", boost: false });
      if (kind === "schedule") assert.equal(api.addScheduleBlock(make(kind, "my-tab")), true);
      if (kind === "favs") api.toggleFav("my-tab");
      if (kind === "checks") api.toggleCheck("my-tab");
      const snapshot = getPersistedDeskState();
      assert.equal(snapshot.buckets.uni[kind].length, DESK_LIMITS[kind] + 1);
      assert.ok(
        snapshot.buckets.uni[kind].some((item) =>
          typeof item === "string" ? item === "my-tab" : (item.text ?? item.title) === "my-tab",
        ),
      );
      assert.equal(useStorageStatus.getState().failed, false);
      assert.equal(hasDeskOverflow(snapshot.buckets), true);
      assert.deepEqual(JSON.parse(data.get(key)).state.buckets, snapshot.buckets);
      // An unrelated edit must not write back a truncated list.
      useDesk.getState().setEarlyStart(true);
      assert.equal(JSON.parse(data.get(key)).state.buckets.uni[kind].length, DESK_LIMITS[kind] + 1);
      await useDesk.persist.rehydrate();
      assert.equal(getPersistedDeskState().buckets.uni[kind].length, DESK_LIMITS[kind] + 1);
      const parsed = parseDeskBackup(JSON.stringify(serializeDeskBackup(getPersistedDeskState())));
      assert.equal(parsed.ok, true);
      assert.equal(await replacePersistedDeskState(parsed.backup.state), true);
      assert.equal(getPersistedDeskState().buckets.uni[kind].length, DESK_LIMITS[kind] + 1);
      // New additions remain blocked, but existing overflow stays editable/removable.
      if (kind === "notes") assert.equal(useDesk.getState().addNote("blocked"), false);
      if (kind === "grades")
        useDesk.getState().addGrade({ title: "blocked", grade: "A", credits: 1, boost: false });
      if (kind === "schedule")
        assert.equal(useDesk.getState().addScheduleBlock(make(kind, "blocked")), false);
      if (kind === "favs") useDesk.getState().toggleFav("blocked");
      if (kind === "checks") useDesk.getState().toggleCheck("blocked");
      if (kind === "notes")
        useDesk
          .getState()
          .toggleNote({ id: getPersistedDeskState().buckets.uni.notes[0].id, index: 0 });
      assert.equal(getPersistedDeskState().buckets.uni[kind].length, DESK_LIMITS[kind] + 1);
      for (const item of getPersistedDeskState().buckets.uni[kind].slice(0, 2)) {
        const api = useDesk.getState();
        // Each pass removes the current head row.
        if (kind === "notes") api.removeNote({ id: item.id, index: 0 });
        if (kind === "grades") api.removeGrade({ id: item.id, index: 0 });
        if (kind === "schedule") api.removeScheduleBlock({ id: item.id, index: 0 });
        if (kind === "favs") api.toggleFav(item);
        if (kind === "checks") api.toggleCheck(item);
      }
      assert.equal(hasDeskOverflow(getPersistedDeskState().buckets), false);
    });
  await replacePersistedDeskState(empty);
  assert.equal(hasDeskOverflow(getPersistedDeskState().buckets), false);
});
