import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { extractUrls, trimUrl } from "./link-extract.mjs";
import { FORECAST_URL } from "../src/lib/forecast.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Audit 2026-11-27 P3-01: the old pattern stopped at the first comma.
test("query commas stay part of the URL", () => {
  const src = `const u = "https://api.example.org/v1?a=1,2&b=x,y,z&c=3";`;
  assert.deepEqual(extractUrls(src), ["https://api.example.org/v1?a=1,2&b=x,y,z&c=3"]);
});

test("the forecast URL is extracted whole from the source that ships it", () => {
  const text = readFileSync(join(root, "src/lib/forecast.ts"), "utf8");
  const found = extractUrls(text).filter((url) => url.includes("api.open-meteo.com"));
  assert.deepEqual(found, [FORECAST_URL]);
  assert.match(FORECAST_URL, /forecast_days=3&temperature_unit=fahrenheit$/);
});

test("the weather card fetches FORECAST_URL rather than its own copy", () => {
  const card = readFileSync(join(root, "src/components/weather.tsx"), "utf8");
  assert.match(card, /fetch\(FORECAST_URL,/);
  assert.equal(extractUrls(card).filter((url) => url.includes("api.open-meteo.com")).length, 0);
});

test("list separators, quotes and sentence punctuation still end a URL", () => {
  assert.deepEqual(extractUrls(`["https://a.org/x", "https://b.org/y"]`), [
    "https://a.org/x",
    "https://b.org/y",
  ]);
  assert.deepEqual(extractUrls("See https://a.org/docs. Then https://b.org/c, ok"), [
    "https://a.org/docs",
    "https://b.org/c",
  ]);
  assert.deepEqual(extractUrls("<a href=https://a.org/p>x</a>"), ["https://a.org/p"]);
});

test("brackets are trimmed only when unbalanced", () => {
  assert.equal(trimUrl("https://a.org/x)"), "https://a.org/x");
  assert.equal(
    trimUrl("https://en.wikipedia.org/wiki/A_(b)"),
    "https://en.wikipedia.org/wiki/A_(b)",
  );
  assert.equal(trimUrl("https://a.org/x]),"), "https://a.org/x");
  assert.deepEqual(extractUrls("{ href: `https://a.org/q?x=1` }"), ["https://a.org/q?x=1"]);
});
