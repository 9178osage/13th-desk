// HTML for one poster: `letter` is the 8.5×11 in print sheet (816×1056 CSS px at
// 96 px/in), `story` is the 1080×1920 phone image (same layout, zoomed and taller).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Calculator,
  CalendarDays,
  Check,
  Clock,
  CloudRain,
  Compass,
  House,
  LibraryBig,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { LANGS, POSTER_COPY, POSTER_URL_LABEL } from "./copy.mjs";

export const FORMATS = {
  letter: { width: 816, height: 1056, zoom: 1, pngDpi: 192 },
  story: { width: 1080, height: 1920, zoom: 1080 / 816, pngDpi: 96 },
};

const PAGE_ICONS = [House, LibraryBig, MapPin, Compass, Calculator];

const esc = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const icon = (Icon, size, strokeWidth = 2) =>
  renderToStaticMarkup(createElement(Icon, { size, strokeWidth, "aria-hidden": true }));

/** Brand fonts as data URLs, so the page needs no server and no network. */
export function fontFaceCss(root) {
  const sheets = [
    "fraunces/500.css",
    "fraunces/600.css",
    "outfit/400.css",
    "outfit/500.css",
    "outfit/600.css",
  ];
  return sheets
    .map((sheet) => {
      const dir = join(root, "node_modules", "@fontsource", sheet.split("/")[0]);
      const css = readFileSync(join(dir, sheet.split("/")[1]), "utf8");
      return css.replace(
        /src: url\(\.\/files\/([^)]+\.woff2)\) format\('woff2'\)[^;]*;/g,
        (_, file) =>
          `src: url(data:font/woff2;base64,${readFileSync(join(dir, "files", file)).toString("base64")}) format('woff2');`,
      );
    })
    .join("\n");
}

/** Headline lines; a closing full stop picks up the brand's blue dot. */
function headline(lines) {
  return lines
    .map((line, index) => {
      const last = index === lines.length - 1 && /[.。]$/.test(line);
      const text = last ? line.slice(0, -1) : line;
      return `<span class="line">${esc(text)}${last ? `<span class="dot">${esc(line.slice(-1))}</span>` : ""}</span>`;
    })
    .join("");
}

/** Rolling hills with fir trees and a pennant on the butte: Eugene on the skyline. */
function hills() {
  const trees = [
    [18, 24],
    [40, 35],
    [60, 27],
    [92, 21],
    [150, 18],
    [205, 26],
    [228, 37],
    [252, 24],
    [330, 19],
    [460, 21],
    [488, 32],
    [512, 24],
    [610, 18],
    [690, 27],
    [716, 40],
    [742, 30],
    [790, 22],
  ]
    .map(([x, h]) => {
      const w = h * 0.5;
      const base = 82;
      return `<path d="M${x} ${base - h}l${w * 0.42} ${h * 0.42}h-${w * 0.16}l${w * 0.37} ${h * 0.34}h-${w * 0.15}l${w * 0.37} ${h * 0.3}h-${w * 2}l${w * 0.37}-${h * 0.3}h-${w * 0.15}l${w * 0.37}-${h * 0.34}h-${w * 0.16}z"/>`;
    })
    .join("");
  return `<svg class="hills" viewBox="0 0 816 92" aria-hidden="true">
    <path fill="#dfe6f4" d="M0 92V62c110-12 210-6 318-17 98-10 170-26 262-29 70-2 132 17 236 31v45z"/>
    <path fill="#285be7" d="M579 17v-24h2.2v24z"/>
    <path fill="#285be7" d="M581.2-7 604 0 581.2 6.5z"/>
    <path fill="#b3c2e3" d="M0 92V72c88-10 170-15 262-6 92 9 160-11 262-8 104 3 190 14 292 6v28z"/>
    <g fill="#172b43">${trees}</g>
    <path fill="#172b43" d="M0 93v-14c200-5 420 3 816-3v17z"/>
  </svg>`;
}

function collage(copy) {
  const [doneTask, ...openTasks] = copy.tasks;
  const bars = [2.7, 3.3, 3.5, 3.9, 3.7]
    .map(
      (gpa, i) => `<rect x="${i * 13}" y="${36 - gpa * 8}" width="8" height="${gpa * 8}" rx="2"/>`,
    )
    .join("");
  return `<section class="collage" aria-hidden="true">
    <div class="card todo">
      <span class="tape"></span>
      <div class="todo-head"><span class="kicker">${esc(copy.todayLabel)}</span><span class="count">1 / 3</span></div>
      <p class="todo-title">${esc(copy.tasksTitle)}</p>
      <ul>
        <li class="done"><span class="box">${icon(Check, 14, 3)}</span><span>${esc(doneTask)}</span></li>
        ${openTasks.map((task) => `<li><span class="box"></span><span>${esc(task)}</span></li>`).join("")}
      </ul>
      <div class="progress"><span></span></div>
    </div>
    <div class="card next">
      <p class="kicker">${icon(CalendarDays, 15)} ${esc(copy.next)}</p>
      <p class="class-name">${esc(copy.className)}</p>
      <p class="class-time">${icon(Clock, 15)} 10:00 – 10:50</p>
    </div>
    <div class="card weather">
      <span class="sky">${icon(CloudRain, 26)}</span>
      <div><p class="temp"><b>52°F</b> ${esc(copy.rain)}</p><p class="advice">${esc(copy.rainAdvice)}</p></div>
    </div>
    <div class="card gpa">
      <div><p class="kicker">GPA</p><p class="gpa-value">3.62</p></div>
      <svg viewBox="0 0 60 36" class="bars">${bars}</svg>
    </div>
  </section>`;
}

export function posterHtml({ lang, format, fontsCss, markSvg, qrSvg }) {
  const copy = POSTER_COPY[lang];
  const size = FORMATS[format];
  const designHeight = size.height / size.zoom;
  const mark = `data:image/svg+xml;base64,${Buffer.from(markSvg).toString("base64")}`;
  const langs = LANGS.map(
    (code) =>
      `<li lang="${POSTER_COPY[code].htmlLang}"${code === lang ? ' class="on"' : ""}>${esc(POSTER_COPY[code].native)}</li>`,
  ).join("");
  const pages = copy.pages
    .map(
      (page, i) => `<li>
        <p class="page-name"><span class="page-icon">${icon(PAGE_ICONS[i], 17)}</span><b>${esc(page.name)}</b></p>
        <span>${esc(page.desc)}</span>
      </li>`,
    )
    .join("");
  return `<!doctype html>
<html lang="${copy.htmlLang}" class="${format}">
<head>
<meta charset="utf-8">
<title>Eugene Desk · ${esc(copy.native)}</title>
<style>
${fontsCss}
@page { size: 8.5in 11in; margin: 0; }
:root {
  --paper: #f5f3ed; --paper-deep: #ece9e1; --card: #fffefa; --ink: #172b43; --muted: #5f6a76;
  --line: #e1e2dc; --blue: #285be7; --blue-deep: #1645bd; --blue-soft: #eaf0ff; --blue-light: #a9c1ff;
  --gold: #825416; --gold-soft: #f8eedb;
  --latin: "Outfit", system-ui, sans-serif;
  --sans: var(--latin);
  --display: "Fraunces", serif;
}
:lang(zh) { --sans: "Outfit", "PingFang SC", "Hiragino Sans GB", sans-serif; --display: "Fraunces", "PingFang SC", serif; }
:lang(ja) { --sans: "Outfit", "Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif; --display: "Fraunces", "Hiragino Sans", serif; }
:lang(ko) { --sans: "Outfit", "Apple SD Gothic Neo", sans-serif; --display: "Fraunces", "Apple SD Gothic Neo", serif; }
/* Outfit has no Vietnamese tone marks; a full-coverage face avoids mixed glyphs. */
:lang(vi) { --sans: system-ui, "Helvetica Neue", sans-serif; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html { zoom: ${size.zoom}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { width: 816px; height: ${designHeight}px; overflow: hidden; background: var(--paper); color: var(--ink); }
[lang], body { font-family: var(--sans); }
ul { list-style: none; }
p, li, span { text-wrap: pretty; }
:lang(zh) *, :lang(ja) * { line-break: strict; }
:lang(ko) * { word-break: keep-all; }
svg { display: block; flex: none; }
.poster { position: relative; width: 816px; height: ${designHeight}px; display: flex; flex-direction: column; padding: 40px 56px 0; overflow: hidden;
  background-image: linear-gradient(rgb(23 43 67 / 4.5%) 1px, transparent 1px), linear-gradient(90deg, rgb(23 43 67 / 4.5%) 1px, transparent 1px);
  background-size: 24px 24px; background-position: -1px -1px; }
.poster::before { content: ""; position: absolute; inset: 0; background: radial-gradient(120% 70% at 85% 8%, rgb(234 240 255 / 85%), transparent 60%); pointer-events: none; }
.poster > * { position: relative; }

.top { display: flex; justify-content: space-between; align-items: flex-start; }
.brand { display: flex; align-items: center; gap: 12px; font-family: var(--latin); }
.brand img { width: 46px; height: 46px; }
.brand strong { display: block; font-family: "Fraunces", serif; font-weight: 600; font-size: 25px; letter-spacing: -0.4px; line-height: 1.05; }
.brand small { display: block; margin-top: 4px; font-size: 10px; font-weight: 500; letter-spacing: 2.4px; color: var(--muted); }
.dot { color: var(--blue); }
.langs { text-align: right; }
.langs-label { display: block; font-size: 11px; font-weight: 500; color: var(--muted); margin-bottom: 6px; }
.langs ul { display: flex; gap: 4px; justify-content: flex-end; }
.langs li { font-size: 11.5px; font-weight: 500; line-height: 1; padding: 6px 9px; border-radius: 99px; border: 1px solid var(--line); background: var(--card); color: var(--ink); }
.langs li.on { background: var(--blue); border-color: var(--blue); color: #fff; }

.hero { margin-top: 34px; }
.eyebrow { display: flex; align-items: center; gap: 9px; font-size: 14px; font-weight: 500; color: var(--muted); }
.eyebrow::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: var(--blue); }
h1 { margin-top: 12px; font-family: var(--display); font-weight: 600; font-size: 70px; line-height: 1.04; letter-spacing: -1.6px; }
h1 .line { display: block; }
:lang(zh) h1, :lang(ja) h1, :lang(ko) h1 { letter-spacing: 0; line-height: 1.16; font-size: 64px; }
.lede { margin-top: 14px; max-width: 610px; font-size: 18px; line-height: 1.5; color: var(--muted); }
.levels { display: flex; align-items: center; gap: 6px; margin-top: 16px; }
.levels > span { font-size: 12.5px; font-weight: 500; color: var(--muted); margin-right: 4px; }
.levels li { font-size: 13px; font-weight: 500; padding: 5px 12px; border-radius: 99px; background: var(--card); border: 1px solid var(--line); }

.collage { position: relative; flex: none; height: 246px; margin-top: 24px; }
.card { position: absolute; background: var(--card); border: 1px solid var(--line); border-radius: 16px; box-shadow: 0 1px 2px rgb(23 43 67 / 6%), 0 14px 32px rgb(23 43 67 / 10%); }
.kicker { display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 500; color: var(--muted); }
.todo { left: 0; top: 12px; width: 392px; padding: 16px 20px 14px; transform: rotate(-1.6deg); }
.tape { position: absolute; top: -13px; left: 150px; width: 92px; height: 26px; background: rgb(248 238 219 / 92%); border: 1px solid rgb(130 84 22 / 14%); transform: rotate(-4deg); }
.todo-head { display: flex; justify-content: space-between; align-items: center; }
.todo-head .kicker { color: var(--blue); }
.count { font-family: var(--latin); font-size: 12.5px; font-weight: 600; color: var(--muted); }
.todo-title { margin-top: 2px; font-family: var(--display); font-size: 21px; font-weight: 600; }
.todo ul { margin-top: 6px; display: grid; }
.todo li { display: flex; align-items: center; gap: 11px; padding: 6px 0; font-size: 15px; border-top: 1px solid var(--line); }
.todo li:first-child { border-top: 0; }
.box { display: grid; place-items: center; width: 20px; height: 20px; flex: none; border-radius: 6px; border: 1.6px solid #c4c8cf; background: #fff; }
.done .box { background: var(--blue); border-color: var(--blue); color: #fff; }
.done span:last-child { color: var(--muted); text-decoration: line-through; text-decoration-color: rgb(95 106 118 / 55%); }
.progress { margin-top: 10px; height: 6px; border-radius: 99px; background: var(--blue-soft); overflow: hidden; }
.progress span { display: block; width: 33.3%; height: 100%; background: var(--blue); border-radius: 99px; }
.next { left: 418px; top: 0; width: 286px; padding: 18px 22px 20px; background: var(--ink); border-color: var(--ink); color: #fff; transform: rotate(1.8deg); }
.next .kicker { color: rgb(255 255 255 / 72%); }
.class-name { margin-top: 6px; font-family: var(--display); font-size: 31px; font-weight: 600; line-height: 1.15; }
.class-time { display: flex; align-items: center; gap: 7px; margin-top: 8px; font-family: var(--latin); font-size: 15px; font-weight: 500; color: var(--blue-light); }
.weather { left: 446px; top: 150px; width: 258px; padding: 14px 16px; display: flex; gap: 12px; align-items: center; transform: rotate(-1.2deg); }
.sky { display: grid; place-items: center; width: 46px; height: 46px; flex: none; border-radius: 12px; background: var(--blue-soft); color: var(--blue); }
.temp { font-size: 14px; color: var(--muted); }
.temp b { font-family: "Fraunces", serif; font-size: 22px; font-weight: 600; color: var(--ink); margin-right: 3px; }
.advice { margin-top: 1px; font-size: 12.5px; line-height: 1.35; color: var(--muted); }
.gpa { left: 300px; top: 172px; width: 150px; padding: 12px 14px; display: flex; align-items: flex-end; justify-content: space-between; background: var(--gold-soft); border-color: rgb(130 84 22 / 18%); transform: rotate(3deg); z-index: 2; }
.gpa .kicker { color: var(--gold); font-family: var(--latin); font-weight: 600; letter-spacing: 1px; }
.gpa-value { font-family: "Fraunces", serif; font-size: 28px; font-weight: 600; line-height: 1.1; }
.bars { width: 54px; height: 32px; fill: var(--blue); }

.pages { display: grid; flex: none; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-top: 22px; }
.pages li { display: flex; flex-direction: column; gap: 4px; }
.page-name { display: flex; align-items: center; gap: 8px; }
.page-icon { display: grid; place-items: center; width: 30px; height: 30px; flex: none; border-radius: 9px; background: var(--blue-soft); color: var(--blue); }
.pages b { font-size: 15px; font-weight: 600; line-height: 1.25; }
.pages li > span:last-child { font-size: 12.5px; line-height: 1.4; color: var(--muted); }

.band { flex: none; margin: auto -56px 0; }
.hills { width: 816px; height: 92px; margin-bottom: -1px; overflow: visible; }
.band-inner { background: var(--ink); color: #fff; padding: 6px 56px 0; }
.cta-row { display: flex; gap: 26px; align-items: center; }
.qr { flex: none; width: 140px; height: 140px; padding: 6px; border-radius: 14px; background: #fff; box-shadow: 0 0 0 3px rgb(169 193 255 / 35%); }
.qr svg { width: 100%; height: 100%; }
.cta { min-width: 0; }
.cta-title { font-family: var(--display); font-size: 31px; font-weight: 600; line-height: 1.15; }
.url { margin-top: 6px; font-family: var(--latin); font-size: 19px; font-weight: 600; color: var(--blue-light); letter-spacing: 0.2px; }
.trust { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
.trust li { display: flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 500; padding: 4px 10px 4px 7px; border-radius: 99px; background: rgb(255 255 255 / 10%); color: rgb(255 255 255 / 90%); }
.trust svg { color: var(--blue-light); }
.works { margin-top: 10px; font-size: 13px; color: rgb(255 255 255 / 70%); }
.fine { padding: 10px 0 16px; margin-top: 14px; border-top: 1px solid rgb(255 255 255 / 12%); font-size: 10px; line-height: 1.45; color: rgb(255 255 255 / 52%); }

/* Phone image: same design zoomed to 1080 wide, using the extra height. */
.story .poster { padding-top: 64px; }
.story .brand img { width: 52px; height: 52px; }
.story .brand strong { font-size: 28px; }
.story .hero { margin-top: 72px; }
.story .eyebrow { font-size: 16px; }
.story h1 { font-size: 90px; margin-top: 18px; }
.story:lang(zh) h1, .story:lang(ja) h1, .story:lang(ko) h1 { font-size: 80px; }
.story:lang(vi) h1 { font-size: 80px; }
.story .lede { font-size: 21px; max-width: 700px; margin-top: 20px; }
.story .levels { margin-top: 24px; }
.story .collage { height: 270px; margin-top: 56px; transform: scale(1.06); transform-origin: top center; }
.story .pages { margin-top: 48px; }
.story .pages b { font-size: 16px; }
.story .pages li > span:last-child { font-size: 13.5px; }
.story .band-inner { padding-top: 14px; }
.story .qr { width: 188px; height: 188px; padding: 8px; }
.story .cta-title { font-size: 34px; }
.story .url { font-size: 21px; }
.story .trust li { font-size: 13.5px; }
.story .works { font-size: 14px; }
.story .fine { font-size: 11px; padding-bottom: 30px; margin-top: 22px; }
</style>
</head>
<body>
<main class="poster">
  <header class="top">
    <div class="brand" lang="en">
      <img src="${mark}" alt="">
      <div><strong>Eugene Desk<span class="dot">.</span></strong><small>EUGENE, OREGON</small></div>
    </div>
    <div class="langs"><span class="langs-label">${esc(copy.langsLabel)}</span><ul>${langs}</ul></div>
  </header>
  <section class="hero">
    <p class="eyebrow">${esc(copy.eyebrow)}</p>
    <h1>${headline(copy.headline)}</h1>
    <p class="lede">${esc(copy.lede)}</p>
    <div class="levels"><span>${esc(copy.levelLabel)}</span><ul style="display:contents">${copy.levels.map((level) => `<li>${esc(level)}</li>`).join("")}</ul></div>
  </section>
  ${collage(copy)}
  <ul class="pages">${pages}</ul>
  <footer class="band">
    ${hills()}
    <div class="band-inner">
      <div class="cta-row">
        <div class="qr">${qrSvg}</div>
        <div class="cta">
          <p class="cta-title">${esc(copy.cta)}</p>
          <p class="url">${esc(POSTER_URL_LABEL)}</p>
          <ul class="trust">${copy.trust.map((item) => `<li>${icon(ShieldCheck, 14)}${esc(item)}</li>`).join("")}</ul>
          <p class="works">${esc(copy.works)}</p>
        </div>
      </div>
      <p class="fine">${esc(copy.fine)}</p>
    </div>
  </footer>
</main>
</body>
</html>`;
}
