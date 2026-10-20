import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { rolldown } from "rolldown";
import { parseDeskBackup, serializeDeskBackup } from "../src/lib/desk-backup.ts";
import { MAX_READ_TEXT } from "../src/lib/desk-records.ts";
import { DESK_LIMITS } from "../src/lib/desk-limits.ts";

test("real timetable edits preserve imported text without relaxing creation or safety limits", async (t) => {
  const names = ["localStorage", "window", "document", "location", "BroadcastChannel"];
  const originals = new Map(
    names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]),
  );
  const data = new Map();
  const key = "13th-desk-v1";
  try {
    Object.assign(globalThis, {
      localStorage: {
        getItem: (name) => data.get(name) ?? null,
        setItem: (name, raw) => data.set(name, raw),
        removeItem: (name) => data.delete(name),
      },
      window: {
        addEventListener() {},
        removeEventListener() {},
        setInterval: () => 0,
        clearInterval() {},
      },
      document: {
        cookie: "",
        getElementById: () => null,
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
    new Function(
      "require",
      "module",
      "exports",
      result.output.find((x) => x.type === "chunk").code,
    )(createRequire(import.meta.url), module, module.exports);
    const { useDesk, ensureDeskHydrated, getPersistedDeskState, replacePersistedDeskState } =
      module.exports;
    await ensureDeskHydrated();
    const empty = getPersistedDeskState();
    const legacy = {
      id: "",
      title: "  " + "课程 Course ".repeat(10) + "  ",
      place: "  " + "Building 教室 ".repeat(10) + "  ",
      day: "mon",
      start: "09:00",
      end: "10:00",
      pinned: true,
    };
    async function importRows(rows) {
      const snapshot = structuredClone(empty);
      snapshot.buckets.uni.schedule = rows;
      const parsed = parseDeskBackup(JSON.stringify(serializeDeskBackup(snapshot)));
      assert.equal(parsed.ok, true, "the fixture is a supported backup");
      assert.equal(await replacePersistedDeskState(parsed.backup.state), true);
    }
    const row = () => useDesk.getState().buckets.uni.schedule[0];
    const assertSaved = () =>
      assert.deepEqual(JSON.parse(data.get(key)).state.buckets, getPersistedDeskState().buckets);

    await t.test(
      "time and weekday edits keep long text, whitespace, ID and pin through reload",
      async () => {
        await importRows([legacy]);
        assert.equal(
          useDesk.getState().updateScheduleBlock("", { ...row(), start: "9:30", day: "tue" }),
          true,
        );
        const expected = { ...legacy, start: "09:30", day: "tue" };
        assert.deepEqual(row(), expected);
        assertSaved();
        await useDesk.persist.rehydrate();
        assert.deepEqual(row(), expected);
        const roundTrip = parseDeskBackup(
          JSON.stringify(serializeDeskBackup(getPersistedDeskState())),
        );
        assert.equal(roundTrip.ok, true);
        assert.deepEqual(roundTrip.backup.state.buckets.uni.schedule, [expected]);
      },
    );

    await t.test("editing one text field does not shorten the other", async () => {
      await importRows([legacy]);
      assert.equal(
        useDesk.getState().updateScheduleBlock("", { ...row(), title: "Updated course" }),
        true,
      );
      assert.equal(row().title, "Updated course");
      assert.equal(row().place, legacy.place);
      assert.equal(useDesk.getState().updateScheduleBlock("", { ...row(), place: "" }), true);
      assert.equal(row().place, "");
      assertSaved();
    });

    await t.test(
      "oversized text, blank titles and invalid times are rejected without any write",
      async () => {
        await importRows([legacy]);
        const before = data.get(key);
        for (const patch of [
          { title: "x".repeat(MAX_READ_TEXT + 1) },
          { place: "x".repeat(MAX_READ_TEXT + 1) },
          { title: "   " },
          { start: "25:00" },
          { end: "09:00" },
        ]) {
          assert.equal(useDesk.getState().updateScheduleBlock("", { ...row(), ...patch }), false);
          assert.equal(data.get(key), before);
          assert.deepEqual(row(), legacy);
        }
      },
    );

    await t.test("a blank-ID course stays editable at the creation cap", async () => {
      const rows = [
        legacy,
        ...Array.from({ length: DESK_LIMITS.schedule - 1 }, (_, i) => ({
          ...legacy,
          id: `other-${i}`,
        })),
      ];
      await importRows(rows);
      assert.equal(useDesk.getState().updateScheduleBlock("", { ...row(), start: "09:30" }), true);
      assert.equal(useDesk.getState().buckets.uni.schedule.length, DESK_LIMITS.schedule);
      assert.deepEqual(useDesk.getState().buckets.uni.schedule.slice(1), rows.slice(1));
      assert.equal(useDesk.getState().addScheduleBlock({ ...legacy, title: "No room" }), false);
      assertSaved();
    });

    await t.test("new courses still use the existing 60-character creation limits", async () => {
      await importRows([]);
      assert.equal(useDesk.getState().addScheduleBlock(legacy), true);
      assert.equal(row().title, legacy.title.trim().slice(0, 60));
      assert.equal(row().place, legacy.place.trim().slice(0, 60));
      assert.notEqual(row().id, "");
      assertSaved();
    });
  } finally {
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
});
