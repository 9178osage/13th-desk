import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { rolldown } from "rolldown";

test("real hydration resolves cookie language and level together, with the pack ready", async (t) => {
  const bundle = await rolldown({
    input: "virtual:desk-hydration-test",
    platform: "node",
    tsconfig: "tsconfig.json",
    resolve: { alias: { "@": process.cwd() + "/src" } },
    transform: { define: { "import.meta.hot": "undefined" } },
    plugins: [
      {
        name: "hydration-test-entry",
        resolveId(id) {
          if (id === "virtual:desk-hydration-test") return id;
        },
        load(id) {
          if (id === "virtual:desk-hydration-test") {
            return 'export {useDesk, ensureDeskHydrated, useStorageStatus} from "@/lib/store"; export {isLangReady} from "@/lib/text";';
          }
        },
      },
    ],
  });
  const output = await bundle.generate({ format: "cjs", codeSplitting: false });
  await bundle.close();
  const code = output.output.find((item) => item.type === "chunk").code;
  const key = "13th-desk-v1";
  const cases = [
    {
      name: "empty storage adopts es.high",
      cookie: "eugene-desk-prefs=es.high",
      saved: null,
      lang: "es",
      level: "high",
      chosen: true,
    },
    {
      name: "legacy save without choices adopts es.high",
      cookie: "eugene-desk-prefs=es.high",
      saved: { buckets: {} },
      lang: "es",
      level: "high",
      chosen: true,
    },
    {
      name: "explicit saved Chinese wins over cookie Spanish",
      cookie: "eugene-desk-prefs=es.high",
      saved: { lang: "zh", langSet: true, buckets: {} },
      lang: "zh",
      level: "high",
      chosen: true,
    },
    {
      name: "no cookie keeps unchosen defaults",
      cookie: "",
      saved: null,
      lang: "zh",
      level: "uni",
      chosen: false,
    },
    ...[
      { name: "future-version desk is held", saved: { buckets: {} }, version: 1 },
      { name: "array buckets are held", saved: { buckets: [] } },
      { name: "null stage is held", saved: { buckets: { uni: null } } },
      { name: "unknown stage is held", saved: { buckets: { future: { notes: ["keep"] } } } },
    ].map((scenario) => ({
      ...scenario,
      cookie: "",
      lang: "zh",
      level: "uni",
      chosen: false,
      held: true,
    })),
  ];
  for (const scenario of cases)
    await t.test(scenario.name, async () => {
      const names = ["localStorage", "window", "document", "location", "BroadcastChannel"];
      const originals = new Map(
        names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]),
      );
      const data = new Map();
      if (scenario.saved)
        data.set(key, JSON.stringify({ state: scenario.saved, version: scenario.version ?? 0 }));
      const original = data.get(key);
      let cookie = scenario.cookie;
      let cookieReads = 0;
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
            setInterval() {
              return 0;
            },
            clearInterval() {},
          },
          document: {
            get cookie() {
              cookieReads++;
              return cookie;
            },
            set cookie(value) {
              cookie = value;
            },
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
        const module = { exports: {} };
        new Function("require", "module", "exports", code)(
          createRequire(import.meta.url),
          module,
          module.exports,
        );
        const { useDesk, ensureDeskHydrated, isLangReady, useStorageStatus } = module.exports;
        if (scenario.lang === "es")
          assert.equal(isLangReady("es"), false, "fixture has no inline pack");
        const readyStates = [];
        const unsubscribe = useDesk.subscribe((state) => {
          if (state.hydrated)
            readyStates.push({ lang: state.lang, packReady: isLangReady(state.lang) });
        });
        await ensureDeskHydrated();
        unsubscribe();
        const state = useDesk.getState();
        assert.deepEqual(
          {
            lang: state.lang,
            level: state.level,
            langSet: state.langSet,
            levelSet: state.levelSet,
          },
          {
            lang: scenario.lang,
            level: scenario.level,
            langSet: scenario.chosen,
            levelSet: scenario.chosen,
          },
        );
        assert.ok(readyStates.length > 0);
        assert.ok(
          readyStates.every((state) => state.lang === scenario.lang && state.packReady),
          "adopted pack is ready before hydration completes",
        );
        assert.equal(cookieReads, 2, "one boot hint read and one shared hydration hint read");
        if (scenario.chosen) assert.ok(cookie.includes(`=${scenario.lang}.${scenario.level};`));
        else assert.ok(cookie.includes("Max-Age=0"));
        if (scenario.held) {
          assert.equal(useStorageStatus.getState().failed, true);
          useDesk.getState().addNote("must stay in memory only");
          assert.equal(
            data.get(key),
            original,
            "hydration and later edits preserve the original bytes",
          );
        } else {
          const persisted = JSON.parse(data.get(key)).state;
          assert.equal(persisted.lang, scenario.lang);
          assert.equal(persisted.level, scenario.level);
          assert.equal(useStorageStatus.getState().failed, false);
        }
      } finally {
        for (const [name, descriptor] of originals) {
          if (descriptor) Object.defineProperty(globalThis, name, descriptor);
          else delete globalThis[name];
        }
      }
    });
});
