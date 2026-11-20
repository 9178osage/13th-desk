/**
 * Project constraints that must survive every change, checked on every `npm test`
 * (and therefore by CI and the Vercel deployment check):
 *  1. platform-owned files are byte-for-byte what `scripts/protected-files.json` records;
 *  2. the browser storage keys never change (existing desks would vanish);
 *  3. every older save and backup format still loads through the one shared reader;
 *  4. sign-in stays off: the flag defaults to off and no auth route is shipped.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { hashProtectedFiles, readManifest } from "./protected-files.mjs";
import { mergeAppEnv, projectRoot, readAppEnv } from "./with-app-env.mjs";
import { authEnabledFromEnvValue } from "./check-auth-invariant.mjs";

const root = projectRoot();
const read = (path) => readFileSync(join(root, path), "utf8");

test("protected platform files are unchanged (scripts/protected-files.json)", () => {
  const expected = readManifest(root);
  const actual = hashProtectedFiles(root);
  assert.ok(Object.keys(expected).length >= 10, "manifest lists the protected files");
  const changed = [...new Set([...Object.keys(expected), ...Object.keys(actual)])]
    .filter((path) => expected[path] !== actual[path])
    .map((path) => `${path}: ${!actual[path] ? "removed" : !expected[path] ? "added" : "edited"}`);
  assert.deepEqual(
    changed,
    [],
    "Protected files changed. Only a platform update may do this; refresh the manifest on purpose with `node scripts/protected-files.mjs --write`.",
  );
});

test("the grok.com script allowance in vercel.json stays as shipped", () => {
  const vercel = JSON.parse(read("vercel.json"));
  const csp = vercel.headers
    .flatMap((rule) => rule.headers)
    .find((header) => header.key === "Content-Security-Policy").value;
  assert.match(csp, /script-src 'self' 'unsafe-inline' https:\/\/grok\.com;/);
  assert.match(csp, /connect-src [^;]*https:\/\/grok\.com https:\/\/\*\.grok\.com/);
});

test("storage keys stay 13th-desk-v1, 13th-desk-v1:pre-import and 13th-desk-v1:recovery:*", async () => {
  const backup = await import("../src/lib/desk-backup.ts");
  assert.equal(backup.DESK_STORAGE_KEY, "13th-desk-v1");
  assert.equal(backup.DESK_PRE_IMPORT_KEY, "13th-desk-v1:pre-import");
  assert.match(read("src/lib/store.ts"), /name: "13th-desk-v1",/);
  assert.match(read("src/lib/boot-script.ts"), /JSON\.stringify\("13th-desk-v1"\)/);
  // Every desk key in the app source is a v1 key: no silent move to a new key.
  const versions = new Set();
  const scan = (dir) => {
    for (const name of readdirSync(join(root, dir))) {
      const path = `${dir}/${name}`;
      if (statSync(join(root, path)).isDirectory()) scan(path);
      else if (/\.(ts|tsx)$/.test(name) && !/\.test\.ts$/.test(name)) {
        for (const match of read(path).matchAll(/13th-desk-v(\d+)/g)) versions.add(match[1]);
      }
    }
  };
  scan("src");
  assert.deepEqual([...versions], ["1"]);

  // A save that cannot be read is archived under the recovery prefix before an import
  // replaces it.
  const { createDeskStorage } = await import("../src/lib/desk-storage.ts");
  const data = new Map([["13th-desk-v1", "{not json"]]);
  const storage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
  const desk = createDeskStorage({ storage, status: () => {} });
  desk.storage.getItem("13th-desk-v1");
  assert.equal(await desk.replace({ state: { lang: "en" }, version: 0 }), true);
  const archived = [...data.keys()].filter((key) => key.startsWith("13th-desk-v1:recovery:"));
  assert.equal(archived.length, 1);
  assert.match(data.get(archived[0]), /\{not json/);
});

test("every older save and backup format still loads through parsePersistedDesk", async () => {
  const { parsePersistedDesk, parseDeskBackup } = await import("../src/lib/desk-backup.ts");
  const fixtures = JSON.parse(read("scripts/fixtures/legacy-desks.json"));
  assert.ok(Object.keys(fixtures).length >= 4);
  for (const [name, fixture] of Object.entries(fixtures)) {
    const state =
      fixture.kind === "backup"
        ? (() => {
            const result = parseDeskBackup(JSON.stringify(fixture.value));
            assert.equal(result.ok, true, `${name}: backup imports`);
            // The backup importer and the save loader are the same reader.
            assert.notEqual(parsePersistedDesk(fixture.value.state, "backup"), null, name);
            return result.backup.state;
          })()
        : parsePersistedDesk(fixture.value.state, "stored");
    assert.notEqual(state, null, `${name}: loads`);
    for (const [stage, counts] of Object.entries(fixture.counts)) {
      const bucket = state.buckets[stage];
      assert.equal(bucket.notes.length, counts.notes, `${name}: ${stage} notes kept`);
      assert.equal(bucket.schedule.length, counts.schedule, `${name}: ${stage} classes kept`);
      assert.equal(bucket.grades.length, counts.grades, `${name}: ${stage} grades kept`);
    }
    // Loading the loaded result again changes nothing: one migration, then stable.
    assert.deepEqual(parsePersistedDesk(state, "stored"), state, `${name}: stable`);
  }
});

test("sign-in stays off: the flag defaults to off and no auth route ships", async () => {
  const appEnv = readAppEnv(root);
  assert.equal(appEnv.VITE_AUTH_ENABLED, "false");
  assert.equal(authEnabledFromEnvValue(mergeAppEnv(appEnv, {}).VITE_AUTH_ENABLED), false);
  // Only the exact string "true" turns sign-in on; unset, empty or anything else is off.
  for (const value of [undefined, "", "false", "0", "TRUE", "yes", " "]) {
    assert.equal(authEnabledFromEnvValue(value), false, String(value));
  }
  const { authFlagOn } = await import("../src/lib/auth/auth-config.ts");
  for (const value of [undefined, "", "false", "TRUE", "1"]) {
    assert.equal(authFlagOn(value), false, String(value));
  }
  // No sign-in pages or endpoints are part of the app: /api/auth/* and /auth/* are 404s.
  assert.equal(existsSync(join(root, "src/routes/api")), false);
  assert.equal(existsSync(join(root, "src/routes/auth")), false);
  const routeTree = read("src/routeTree.gen.ts");
  assert.doesNotMatch(routeTree, /['"]\/api\//);
  assert.doesNotMatch(routeTree, /['"]\/auth\//);
});
