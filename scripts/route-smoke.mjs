#!/usr/bin/env node
/**
 * Every indexable page, desktop and phone, judged by the same rules as
 * browser-smoke.mjs: navigation must succeed, the console must stay clean, and the page
 * must not be blank or scroll sideways. Writes no screenshots, so it runs anywhere (CI
 * included). Usage: node scripts/route-smoke.mjs [base URL, default http://127.0.0.1:8081]
 *
 * Exit codes follow exitCodeFor: 1 navigation, 2 errors, 3 blank or overflow, 0 clean.
 */
import { chromium } from "playwright";
import { checkedUrl } from "./browser-guard.mjs";
import { exitCodeFor, normalizeBodyText, viewportProblems } from "./browser-smoke-verdict.mjs";
import { SITE_PAGES } from "../src/lib/site.ts";

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
];

/** Analytics only answers on Vercel; its absence on a local preview is not a page error. */
function ignorableConsoleError(text) {
  return /\/_vercel\/(insights|speed-insights)\//.test(text);
}

const base = checkedUrl(process.argv[2] || "http://127.0.0.1:8081").replace(/\/$/, "");
let browser = null;
let worst = 0;
try {
  browser = await chromium.launch();
  for (const path of SITE_PAGES) {
    const viewports = {};
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      const consoleErrors = [];
      const pageErrors = [];
      page.on("console", (msg) => {
        if (msg.type() !== "error") return;
        const where = msg.location()?.url ?? "";
        if (!ignorableConsoleError(`${msg.text()} ${where}`)) consoleErrors.push(msg.text());
      });
      page.on("pageerror", (err) => pageErrors.push(String(err?.message || err)));
      const resp = await page
        .goto(base + path, { waitUntil: "domcontentloaded", timeout: 30_000 })
        .catch(() => null);
      await page.waitForTimeout(1500);
      const text = await page
        .locator("body")
        .innerText()
        .catch(() => "");
      viewports[vp.name] = {
        status: resp?.status() ?? 0,
        hasCanvas: (await page.locator("canvas").count()) > 0,
        bodyTextLen: normalizeBodyText(text).length,
        horizontalOverflow: await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        ),
        consoleErrors,
        pageErrors,
      };
      await page.close();
    }
    const code = exitCodeFor(viewports);
    const notes = Object.entries(viewports).flatMap(([name, v]) => [
      ...(v.status >= 400 || v.status === 0 ? [`${name}: HTTP ${v.status}`] : []),
      ...[...v.consoleErrors, ...v.pageErrors].map((e) => `${name}: ${e.slice(0, 200)}`),
      ...viewportProblems(v).map((p) => `${name}: ${p}`),
    ]);
    const lengths = Object.entries(viewports)
      .map(([name, v]) => `${name} ${v.bodyTextLen} chars`)
      .join(", ");
    console.log(`${code === 0 ? "ok  " : "FAIL"} ${path} (${lengths})`);
    for (const note of notes) console.log(`     ${note}`);
    if (code !== 0 && (worst === 0 || code < worst)) worst = code;
  }
  process.exitCode = worst;
} catch (err) {
  console.error(String(err?.message || err));
  process.exitCode = 1;
} finally {
  await browser?.close();
}
