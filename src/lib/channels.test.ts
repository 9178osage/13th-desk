import { test } from "node:test";
import assert from "node:assert/strict";
import { CHANNELS, channelEntry, homeAliasPath, isChannel } from "./channels.ts";
import { readFileSync } from "node:fs";

test("only the listed channel slugs are entry paths", () => {
  assert.deepEqual([...CHANNELS], ["card", "isa", "teacher", "eld"]);
  for (const slug of CHANNELS) assert.equal(isChannel(slug), true);
  for (const slug of [
    "",
    "foo",
    "Card",
    "ISA",
    "guide",
    "gpa",
    "campus",
    "town",
    "card/x",
    "__proto__",
    "toString",
  ]) {
    assert.equal(isChannel(slug), false, slug);
  }
  assert.equal(isChannel(undefined), false);
  assert.equal(isChannel(null), false);
});

test("a channel entry records its own path and ends on /", () => {
  assert.deepEqual(channelEntry("/card"), { record: "/card", then: "/" });
  assert.deepEqual(channelEntry("/isa/"), { record: "/isa", then: "/" });
  assert.deepEqual(channelEntry("/eld"), { record: "/eld", then: "/" });
  for (const path of ["/", "/guide", "/foo", "/card/x", "/cards"])
    assert.equal(channelEntry(path), null, path);
});

test("nav treats a channel path as the home tab", () => {
  assert.equal(homeAliasPath("/card"), "/");
  assert.equal(homeAliasPath("/teacher"), "/");
  assert.equal(homeAliasPath("/guide"), "/guide");
  assert.equal(homeAliasPath("/"), "/");
});

test("analytics stays cookieless and manual: no auto-track, no Speed Insights", () => {
  const src = readFileSync(new URL("../components/site-analytics.tsx", import.meta.url), "utf8");
  assert.match(src, /disableAutoTrack: true/);
  assert.match(src, /import\.meta\.env\.PROD/);
  assert.match(src, /window\.self !== window\.top/);
  assert.doesNotMatch(src, /localStorage\.|document\.cookie|speed-insights/);
  const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
  assert.ok(pkg.dependencies["@vercel/analytics"]);
  assert.equal(pkg.dependencies["@vercel/speed-insights"], undefined);
});
