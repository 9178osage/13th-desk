#!/usr/bin/env node
/**
 * Probe every external URL the app ships and fail when one stops answering.
 *
 * Links live in `src/` (quick links, place hours, guide, calendar sources), so a dead
 * URL is a broken button for a student, not a docs nit. Data this inert rots silently,
 * hence a scheduled run rather than a habit.
 *
 * Thresholds are deliberately lenient on the two ways an honest probe lies:
 *   - bot protection (403/429) is a warning, never a failure on its own;
 *   - a single timeout is retried once, and up to three are tolerated overall.
 * Clear 4xx/5xx answers, DNS failures and refused connections always fail.
 *
 * Usage:
 *   node scripts/check-links.mjs [--json] [--verbose] [--timeout-ms 20000] [--concurrency 8]
 * Exit: 0 pass, 1 the thresholds above were crossed, 2 the scan itself found nothing to check.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const option = (name, fallback) => {
  const index = argv.indexOf(name);
  return index === -1 ? fallback : Number(argv[index + 1]);
};

const JSON_OUT = flag("--json");
const VERBOSE = flag("--verbose");
const TIMEOUT_MS = option("--timeout-ms", 20000);
const CONCURRENCY = option("--concurrency", 8);
const MAX_WARNINGS = 3;
const MAX_TIMEOUTS = 3;

// Hosts that exist only for the platform or for tests: probing them from CI says
// nothing about the app, and they are not student-facing destinations.
const SKIP_HOSTS = [
  "grok.me",
  "grok.com",
  "app-builder-testing.com",
  "connectors.invalid.example",
  "preview.invalid",
  "example.com",
  "vercel.app",
];
// Rechecked daily (~35 requests); a friendlier cadence and UA keeps us off rate limits.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36 EugeneDeskLinkCheck/1.0";

function sourceFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (/\.tsx?$/.test(entry)) out.push(path);
  }
  return out;
}

function collect() {
  const found = new Map();
  for (const file of sourceFiles(join(root, "src"))) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(/https?:\/\/[^\s"'`)\]},;]+/g)) {
      const url = match[0].replace(/[.,;)]+$/, "");
      // Template expressions and local addresses are not external links.
      if (url.includes("${") || /127\.0\.0\.1|localhost|\[::1\]/.test(url)) continue;
      let host;
      try {
        host = new URL(url).hostname;
      } catch {
        continue;
      }
      if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host)) continue;
      if (SKIP_HOSTS.some((skip) => host === skip || host.endsWith(`.${skip}`))) continue;
      if (!found.has(url)) found.set(url, file.replace(`${root}/`, ""));
    }
  }
  return [...found]
    .map(([url, file]) => ({ url, file }))
    .sort((a, b) => a.url.localeCompare(b.url));
}

async function probeOnce(url) {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,*/*" },
  });
  return { status: response.status, finalUrl: response.url };
}

async function probe(entry) {
  const attempts = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { status, finalUrl } = await probeOnce(entry.url);
      const redirect = finalUrl && finalUrl.replace(/\/$/, "") !== entry.url.replace(/\/$/, "");
      if (status >= 200 && status < 400)
        return { ...entry, status, outcome: "ok", redirect: redirect ? finalUrl : null };
      if (status === 403 || status === 429)
        return { ...entry, status, outcome: "warn", note: "bot protection" };
      if (status === 401) return { ...entry, status, outcome: "warn", note: "needs sign-in" };
      return { ...entry, status, outcome: "fail" };
    } catch (error) {
      attempts.push(
        error.name === "TimeoutError" || error.name === "AbortError"
          ? "timeout"
          : String(error.cause?.code ?? error.message),
      );
      if (attempt === 0) await new Promise((done) => setTimeout(done, 1500));
    }
  }
  const why = attempts.join(" / ");
  return {
    ...entry,
    status: null,
    outcome: why.includes("timeout") ? "timeout" : "fail",
    note: why,
  };
}

const targets = collect();
if (targets.length === 0) {
  console.error("no external links found under src/ — the scan or the app changed shape");
  process.exit(2);
}

const results = [];
let cursor = 0;
await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, targets.length) }, async () => {
    while (cursor < targets.length) {
      const entry = targets[cursor++];
      const result = await probe(entry);
      results.push(result);
      if (VERBOSE) {
        const code = String(result.status ?? "-").padStart(4);
        console.log(`  ${result.outcome.toUpperCase().padEnd(7)} ${code}  ${result.url}`);
      }
    }
  }),
);
results.sort((a, b) => a.url.localeCompare(b.url));

const failed = results.filter((r) => r.outcome === "fail");
const timedOut = results.filter((r) => r.outcome === "timeout");
const warned = results.filter((r) => r.outcome === "warn");
const redirected = results.filter((r) => r.redirect);
const passes = results.length - failed.length - timedOut.length - warned.length;
const breached =
  failed.length > 0 || timedOut.length > MAX_TIMEOUTS || warned.length > MAX_WARNINGS;

if (JSON_OUT) {
  console.log(
    JSON.stringify(
      { checked: results.length, passes, failed, timedOut, warned, redirected, breached },
      null,
      2,
    ),
  );
} else {
  for (const r of failed)
    console.log(`  FAIL  ${r.url}\n        ${r.status ?? r.note}  (${r.file})`);
  for (const r of timedOut) console.log(`  TIME  ${r.url}\n        ${r.note}  (${r.file})`);
  for (const r of warned)
    console.log(`  WARN  ${r.url}\n        ${r.status} ${r.note}  (${r.file})`);
  if (VERBOSE)
    for (const r of redirected) console.log(`  moved ${r.url}\n        -> ${r.redirect}`);
  console.log(
    `\n  ${results.length} external links: ${passes} ok, ${redirected.length} redirected, ${warned.length} warned, ` +
      `${timedOut.length} timed out, ${failed.length} failed  (tolerate ${MAX_TIMEOUTS} timeouts, ${MAX_WARNINGS} warnings)`,
  );
}
process.exit(breached ? 1 : 0);
