import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, delimiter } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { tempDir } from "./temp-dir.mjs";

const wrapper = fileURLToPath(new URL("./vercel-npm.mjs", import.meta.url));
const cwd = tempDir("vercel-npm-");
writeFileSync(
  join(cwd, "package.json"),
  JSON.stringify({
    private: true,
    scripts: { nested: "npm config get cache", fail: 'node -e "process.exit(7)"' },
  }),
);

function run(args, env = {}) {
  return spawnSync(process.execPath, [wrapper, ...args], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH}`,
      ...env,
    },
  });
}

test("both Vercel entry points use the wrapper before npm starts", () => {
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.equal(
    config.installCommand,
    "node scripts/vercel-npm.mjs ci --omit=dev --ignore-scripts --no-audit --no-fund",
  );
  assert.equal(config.buildCommand, "node scripts/vercel-npm.mjs run build");
});

test("removes only cache-dir, preserves the real cache, and covers nested npm", () => {
  const cache = join(cwd, "npm-cache");
  for (const key of ["npm_config_cache_dir", "NPM_CONFIG_CACHE_DIR"]) {
    const result = run(["run", "nested"], {
      [key]: "/vercel/path0/.vercel/cache/pnpm",
      npm_config_cache: cache,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.stdout.includes(cache));
    assert.ok(result.stdout.includes(`Removed unsupported build environment setting: ${key}`));
    assert.ok(!result.stdout.includes("/vercel/path0/.vercel/cache/pnpm"));
    assert.doesNotMatch(result.stderr, /Unknown env config "cache-dir"/);
  }
});

test("does not suppress warnings for other invalid npm configuration", () => {
  const result = run(["config", "get", "cache"], { npm_config_unknown_probe: "1" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /Unknown env config "unknown-probe"/);
  assert.doesNotMatch(result.stdout, /Removed unsupported/);
});

test("propagates npm failures", () => {
  const result = run(["run", "fail"]);
  assert.equal(result.status, 7, result.stderr);
});

test("reports a missing npm executable instead of succeeding", () => {
  const result = run(["--version"], { PATH: cwd });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Failed to start npm/);
});
