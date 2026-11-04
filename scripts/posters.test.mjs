import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { LANGS, POSTER_COPY, POSTER_URL, POSTER_URL_LABEL } from "./posters/copy.mjs";
import { posterFile } from "./posters/render.mjs";

const root = new URL("../", import.meta.url);
const posterPath = (name) => new URL(`public/posters/${name}`, root);

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

test("the QR code and printed URL point at the /poster channel", () => {
  assert.equal(POSTER_URL, "https://eugene-desk.vercel.app/poster");
  assert.equal(`https://${POSTER_URL_LABEL}`, POSTER_URL);
  const qr = readFileSync(new URL("posters/qr-poster.svg", import.meta.url), "utf8");
  assert.match(qr, new RegExp(`<title>QR code: ${POSTER_URL}</title>`));
  const channels = readFileSync(new URL("src/lib/channels.ts", root), "utf8");
  const slug = new URL(POSTER_URL).pathname.slice(1);
  assert.match(channels, new RegExp(`CHANNELS = \\[[^\\]]*"${slug}"`));
});

test("every language has a Letter PDF, a Letter PNG and a phone-size PNG", () => {
  const pngSize = (name) => {
    const bytes = readFileSync(posterPath(name));
    assert.equal(bytes.toString("latin1", 1, 4), "PNG", name);
    return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  };
  for (const lang of LANGS) {
    assert.deepEqual(pngSize(posterFile(lang, "letter", "png")), [1632, 2112], lang);
    assert.deepEqual(pngSize(posterFile(lang, "story", "png")), [1080, 1920], lang);
    const pdfName = posterFile(lang, "letter", "pdf");
    const pdf = readFileSync(posterPath(pdfName)).toString("latin1");
    assert.ok(pdf.startsWith("%PDF-"), pdfName);
    assert.match(pdf, /\/MediaBox \[0 0 612 792\]/, `${pdfName} is US Letter`);
    assert.equal(pdf.match(/\/Type \/Page\b/g)?.length, 1, `${pdfName} has one page`);
    assert.ok(statSync(posterPath(pdfName)).size < 2_000_000, `${pdfName} stays small`);
  }
});
