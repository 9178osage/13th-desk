#!/usr/bin/env node
/**
 * The cookie-personalized HTML must arrive with `Vary: Cookie` on EVERY
 * response, not just the successful ones.
 *
 * `src/routes/__root.tsx` sets `Cache-Control: private, no-cache` and
 * `Vary: Cookie` through `setResponseHeader()`. h3 only merges those prepared
 * headers into a Response that is `ok` (see `prepareResponse`: a bare
 * `if (!preparedHeaders || nested || !val.ok) return val;`), so a 404/500 —
 * whose body is still the app document, rendered from the visitor's
 * `eugene-desk-prefs` cookie — ships with no `Vary` at all and is therefore
 * cacheable by any shared cache. `vercel.json` closes that hole at the platform
 * layer, where the rule is applied to the response regardless of its status.
 *
 * This asserts the config that fixes it and pins the reason, so a future
 * cleanup cannot quietly drop the header while the root-route call still looks
 * correct.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const vercel = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));

test("every HTML response varies on Cookie, including 404/500", () => {
  const rules = vercel.headers ?? [];
  // App routes (including HTML 404/500 routes) vary on Cookie. Static files do not.
  const rule = rules.find((item) =>
    item.headers.some((header) => header.key.toLowerCase() === "vary"),
  );
  assert.ok(rule, "vercel.json needs a Vary rule");
  assert.equal(rule.source, "/((?!assets/|.*\\.[^/]+$).*)");
  const pattern = new RegExp(`^${rule.source}$`);
  for (const path of [
    "/",
    "/guide",
    "/nope",
    "/assetsx",
    "/poster",
    "/nested/not-found",
    "/api/auth/get-session",
  ]) {
    assert.ok(pattern.test(path), path);
  }
  for (const path of [
    "/assets/index-abc.js",
    "/posters/eugene-desk-poster-en-letter.pdf",
    "/brand/logo.svg",
    "/robots.txt",
    "/sitemap.xml",
  ]) {
    assert.ok(!pattern.test(path), path);
  }
  const vary = rule.headers.find((header) => header.key.toLowerCase() === "vary");
  assert.match(
    vary.value,
    /(^|,)\s*Cookie\s*(,|$)/,
    "Vary must include Cookie: the HTML depends on eugene-desk-prefs",
  );
  const root = readFileSync(new URL("../src/routes/__root.tsx", import.meta.url), "utf8");
  assert.match(root, /setResponseHeader\("Vary", "Cookie"\)/);
});
