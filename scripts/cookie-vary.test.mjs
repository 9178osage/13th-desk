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

test("every response varies on Cookie, including 404/500", () => {
  const rules = vercel.headers ?? [];
  const catchAll = rules.find((rule) => rule.source === "/(.*)");
  assert.ok(catchAll, "vercel.json needs a catch-all header rule");
  const vary = catchAll.headers.find((header) => header.key.toLowerCase() === "vary");
  assert.ok(vary, "the catch-all rule must set Vary");
  assert.match(
    vary.value,
    /(^|,)\s*Cookie\s*(,|$)/,
    "Vary must include Cookie: the HTML depends on eugene-desk-prefs",
  );
  const root = readFileSync(new URL("../src/routes/__root.tsx", import.meta.url), "utf8");
  assert.match(root, /setResponseHeader\("Vary", "Cookie"\)/);
});
