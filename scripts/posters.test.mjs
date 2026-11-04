import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import jsQR from "jsqr";
import { chromium } from "playwright";
import { PNG } from "pngjs";
import { deskText } from "../src/lib/desk-copy.ts";
import { skyAdvice } from "../src/lib/sky-advice.ts";
import { LANGS, POSTER_COPY, POSTER_URL, POSTER_URL_LABEL } from "./posters/copy.mjs";
import { posterFile } from "./posters/render.mjs";

const root = new URL("../", import.meta.url);
const posterPath = (name) => new URL(`public/posters/${name}`, root);
const sitePacks = Object.fromEntries(
  ["es", "ko", "vi", "ja"].map((lang) => [
    lang,
    JSON.parse(readFileSync(new URL(`../src/lib/i18n/${lang}.json`, import.meta.url), "utf8")),
  ]),
);

test("poster copy is complete in all six site languages", () => {
  assert.deepEqual(LANGS, ["en", "zh", "es", "ko", "vi", "ja"]);
  assert.deepEqual(Object.keys(POSTER_COPY).sort(), [...LANGS].sort());
  const keys = Object.keys(POSTER_COPY.en).sort();
  for (const lang of LANGS) {
    const copy = POSTER_COPY[lang];
    assert.deepEqual(Object.keys(copy).sort(), keys, lang);
    assert.equal(copy.headline.length, 2, `${lang} headline`);
    assert.equal(copy.levels.length, 4, `${lang} levels`);
    assert.equal(copy.pages.length, 5, `${lang} pages`);
    assert.equal(copy.tasks.length, 3, `${lang} tasks`);
    assert.equal(copy.trust.length, 3, `${lang} trust`);
    const strings = JSON.stringify(copy).match(/"(?:[^"\\]|\\.)*"/g);
    for (const value of strings) assert.notEqual(value.trim(), '""', `${lang} has an empty string`);
  }
});

test("poster text shared with the site stays in sync in all six languages", () => {
  const pageKeys = ["today", "campus", "town", "guide", "gpa"];
  for (const lang of LANGS) {
    const copy = POSTER_COPY[lang];
    const headlineSeparator = ["zh", "ja"].includes(lang) ? "" : " ";
    assert.equal(
      copy.headline.join(headlineSeparator),
      deskText(lang, "welcome"),
      `${lang} headline`,
    );
    assert.equal(copy.lede, deskText(lang, "intro"), `${lang} intro`);
    assert.equal(copy.levelLabel, deskText(lang, "level"), `${lang} level label`);
    assert.equal(copy.tasksTitle, deskText(lang, "tasks"), `${lang} task title`);
    assert.equal(copy.next, deskText(lang, "next"), `${lang} next class`);
    assert.deepEqual(
      copy.pages.map(({ name }) => name),
      pageKeys.map((key) => deskText(lang, key)),
      `${lang} page names`,
    );

    const advice = skyAdvice("rain", "elem");
    const siteAdvice = advice[lang] ?? sitePacks[lang]?.[advice.en];
    assert.equal(copy.rainAdvice, siteAdvice, `${lang} rain advice`);
  }
});

test("the QR code and printed URL point at the /poster channel", () => {
  assert.equal(POSTER_URL, "https://eugene-desk.vercel.app/poster");
  assert.equal(`https://${POSTER_URL_LABEL}`, POSTER_URL);
  const qr = readFileSync(new URL("posters/qr-poster.svg", import.meta.url), "utf8");
  assert.match(qr, new RegExp(`<title>QR code: ${POSTER_URL}</title>`));
  const channels = readFileSync(new URL("src/lib/channels.ts", root), "utf8");
  const slug = new URL(POSTER_URL).pathname.slice(1);
  assert.match(channels, new RegExp(`CHANNELS = \\[[^\\]]*"${slug}"`));
});

test("every poster PNG contains a QR code that decodes to the /poster URL", () => {
  for (const lang of LANGS) {
    for (const format of ["letter", "story"]) {
      const name = posterFile(lang, format, "png");
      const image = PNG.sync.read(readFileSync(posterPath(name)));
      const decoded = jsQR(new Uint8ClampedArray(image.data), image.width, image.height, {
        inversionAttempts: "dontInvert",
      });
      assert.equal(decoded?.data, POSTER_URL, `${name} QR code`);
    }
  }
});

test(
  "every Letter PDF contains a QR code that decodes to the /poster URL",
  async () => {
    const pdfJs = readFileSync(
      new URL("../node_modules/pdfjs-dist/build/pdf.mjs", import.meta.url),
    );
    const pdfJsWorker = readFileSync(
      new URL("../node_modules/pdfjs-dist/build/pdf.worker.mjs", import.meta.url),
    );
    const pdfNames = new Set(LANGS.map((lang) => posterFile(lang, "letter", "pdf")));
    const html = `<!doctype html>
    <canvas></canvas>
    <script type="module">
      import { getDocument, GlobalWorkerOptions } from "/pdf.mjs";
      GlobalWorkerOptions.workerSrc = "/pdf.worker.mjs";
      try {
        const file = new URLSearchParams(location.search).get("file");
        const pdf = await getDocument({ url: "/poster.pdf?file=" + encodeURIComponent(file) }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.querySelector("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
        window.pdfReady = true;
      } catch (error) {
        window.pdfError = error.stack || String(error);
      }
    </script>`;
    const server = createServer((request, response) => {
      const url = new URL(request.url, "http://127.0.0.1");
      if (url.pathname === "/") {
        response.writeHead(200, { "content-type": "text/html" }).end(html);
      } else if (url.pathname === "/pdf.mjs") {
        response.writeHead(200, { "content-type": "text/javascript" }).end(pdfJs);
      } else if (url.pathname === "/pdf.worker.mjs") {
        response.writeHead(200, { "content-type": "text/javascript" }).end(pdfJsWorker);
      } else if (url.pathname === "/poster.pdf" && pdfNames.has(url.searchParams.get("file"))) {
        const pdf = readFileSync(posterPath(url.searchParams.get("file")));
        response
          .writeHead(200, {
            "content-length": pdf.length,
            "content-type": "application/pdf",
          })
          .end(pdf);
      } else {
        response.writeHead(404).end();
      }
    });
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });

    let browser;
    try {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      for (const lang of LANGS) {
        const name = posterFile(lang, "letter", "pdf");
        await page.goto(
          `http://127.0.0.1:${server.address().port}/?file=${encodeURIComponent(name)}`,
        );
        await page.waitForFunction(() => window.pdfReady || window.pdfError, null, {
          timeout: 30_000,
        });
        assert.equal(await page.evaluate(() => window.pdfError), undefined, name);
        const image = PNG.sync.read(await page.locator("canvas").screenshot());
        const decoded = jsQR(new Uint8ClampedArray(image.data), image.width, image.height, {
          inversionAttempts: "dontInvert",
        });
        assert.equal(decoded?.data, POSTER_URL, `${name} QR code`);
      }
    } finally {
      await browser?.close();
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  },
  { timeout: 120_000 },
);

test("every language has a Letter PDF, a Letter PNG and a phone-size PNG", () => {
  const pngInfo = (name) => {
    const bytes = readFileSync(posterPath(name));
    assert.equal(bytes.toString("latin1", 1, 4), "PNG", name);
    let width;
    let height;
    let resolution;
    for (let offset = 8; offset < bytes.length;) {
      const length = bytes.readUInt32BE(offset);
      const type = bytes.toString("ascii", offset + 4, offset + 8);
      const data = offset + 8;
      if (type === "IHDR") {
        width = bytes.readUInt32BE(data);
        height = bytes.readUInt32BE(data + 4);
      } else if (type === "pHYs") {
        assert.equal(resolution, undefined, `${name} has one resolution chunk`);
        assert.equal(bytes[data + 8], 1, `${name} resolution uses meters`);
        resolution = [bytes.readUInt32BE(data), bytes.readUInt32BE(data + 4)];
      }
      offset += length + 12;
    }
    return { width, height, resolution };
  };
  for (const lang of LANGS) {
    const letter = pngInfo(posterFile(lang, "letter", "png"));
    assert.deepEqual([letter.width, letter.height], [1632, 2112], `${lang} Letter pixels`);
    assert.deepEqual(letter.resolution, [7559, 7559], `${lang} Letter PNG at 192 DPI`);
    assert.ok(
      Math.abs((letter.width / letter.resolution[0]) * 39.3701 - 8.5) < 0.002,
      `${lang} is 8.5 inches wide`,
    );
    assert.ok(
      Math.abs((letter.height / letter.resolution[1]) * 39.3701 - 11) < 0.002,
      `${lang} is 11 inches tall`,
    );

    const story = pngInfo(posterFile(lang, "story", "png"));
    assert.deepEqual([story.width, story.height], [1080, 1920], `${lang} story pixels`);
    assert.deepEqual(story.resolution, [3780, 3780], `${lang} story PNG at 96 DPI`);

    const pdfName = posterFile(lang, "letter", "pdf");
    const pdf = readFileSync(posterPath(pdfName)).toString("latin1");
    assert.ok(pdf.startsWith("%PDF-"), pdfName);
    assert.match(pdf, /\/MediaBox \[0 0 612 792\]/, `${pdfName} is US Letter`);
    assert.equal(pdf.match(/\/Type \/Page\b/g)?.length, 1, `${pdfName} has one page`);
    assert.ok(statSync(posterPath(pdfName)).size < 2_000_000, `${pdfName} stays small`);
  }
});
