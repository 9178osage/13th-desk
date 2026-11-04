#!/usr/bin/env node
// Renders the six-language poster set into public/posters/:
//   eugene-desk-poster-<lang>-letter.pdf  US Letter print sheet (vector text)
//   eugene-desk-poster-<lang>-letter.png  same sheet at 192 dpi
//   eugene-desk-poster-<lang>-story.png   1080×1920 phone / social image
// Usage: npm run posters [-- en zh]   (no languages = all six)
// Fails without writing anything for a language whose layout overflows.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { LANGS } from "./copy.mjs";
import { FORMATS, fontFaceCss, posterHtml } from "./template.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const outDir = join(root, "public", "posters");

export const posterFile = (lang, format, ext) => `eugene-desk-poster-${lang}-${format}.${ext}`;

/** Layout problems in the rendered page, in design pixels; empty when it fits. */
function layoutProblems() {
  const problems = [];
  const poster = document.querySelector(".poster").getBoundingClientRect();
  const scale = poster.width / 816;
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return {
      top: (r.top - poster.top) / scale,
      bottom: (r.bottom - poster.top) / scale,
      left: (r.left - poster.left) / scale,
      right: (r.right - poster.left) / scale,
      height: r.height / scale,
    };
  };
  const height = poster.height / scale;
  const label = (el) =>
    `${el.className || el.tagName.toLowerCase()} "${el.textContent.trim().slice(0, 40)}"`;

  for (const el of document.querySelectorAll(".poster *")) {
    const b = box(el);
    if (b.left < -0.5 || b.right > 816.5) problems.push(`${label(el)} spills sideways`);
    if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow === "hidden")
      problems.push(`${label(el)} clips its text`);
  }
  for (const el of document.querySelectorAll(
    ".brand strong, .langs ul, .levels, h1 .line, .url, .class-time",
  )) {
    const lineHeight =
      parseFloat(getComputedStyle(el).lineHeight) ||
      parseFloat(getComputedStyle(el).fontSize) * 1.3;
    if (box(el).height > lineHeight * 1.5 + 14)
      problems.push(`${label(el)} wraps onto a second line`);
  }
  const band = box(document.querySelector(".band"));
  if (Math.abs(band.bottom - height) > 1)
    problems.push(`footer pushed off the page (ends at ${band.bottom.toFixed(0)})`);
  const pages = box(document.querySelector(".pages"));
  if (pages.bottom > band.top + 4)
    problems.push(`feature row runs into the footer by ${(pages.bottom - band.top).toFixed(0)}px`);
  for (const card of document.querySelectorAll(".card")) {
    if (box(card).bottom > pages.top - 6) problems.push(`${label(card)} overlaps the feature row`);
  }
  const fine = box(document.querySelector(".fine"));
  if (fine.bottom > height + 0.5) problems.push("fine print falls off the page");
  return problems;
}

async function main() {
  const wanted = process.argv.slice(2);
  const unknown = wanted.filter((lang) => !LANGS.includes(lang));
  if (unknown.length)
    throw new Error(`unknown language: ${unknown.join(", ")} (use ${LANGS.join(", ")})`);
  const langs = wanted.length ? wanted : LANGS;

  const fontsCss = fontFaceCss(root);
  const markSvg = readFileSync(join(root, "public", "brand", "eugene-desk-mark.svg"), "utf8");
  const qrSvg = readFileSync(join(here, "qr-poster.svg"), "utf8");
  mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const failures = [];
  try {
    for (const lang of langs) {
      const rendered = [];
      for (const format of Object.keys(FORMATS)) {
        const { width, height } = FORMATS[format];
        const page = await browser.newPage({
          viewport: { width, height },
          deviceScaleFactor: format === "letter" ? 2 : 1,
        });
        await page.setContent(posterHtml({ lang, format, fontsCss, markSvg, qrSvg }), {
          waitUntil: "load",
        });
        await page.evaluate(() => document.fonts.ready);
        const problems = await page.evaluate(layoutProblems);
        if (problems.length) {
          failures.push(...problems.map((problem) => `${lang} ${format}: ${problem}`));
          await page.close();
          continue;
        }
        rendered.push([posterFile(lang, format, "png"), await page.screenshot({ type: "png" })]);
        if (format === "letter") {
          rendered.push([
            posterFile(lang, format, "pdf"),
            await page.pdf({
              width: "8.5in",
              height: "11in",
              printBackground: true,
              margin: { top: 0, right: 0, bottom: 0, left: 0 },
            }),
          ]);
        }
        await page.close();
      }
      if (rendered.length === 3) {
        for (const [name, bytes] of rendered) writeFileSync(join(outDir, name), bytes);
        console.log(`${lang}: ${rendered.map(([name]) => name).join(", ")}`);
      }
    }
  } finally {
    await browser.close();
  }
  if (failures.length) {
    console.error(`Poster layout problems:\n  ${failures.join("\n  ")}`);
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
