import assert from "node:assert/strict";
import test from "node:test";
import { injectGrokPwaHead, publicAppHost, renderWebManifest } from "./grok-pwa-shared.mjs";

test("only the public Eugene Vercel hostname is exempted", () => {
  assert.equal(publicAppHost("eugene-desk.vercel.app"), "eugene-desk.vercel.app");
  assert.equal(publicAppHost("preview-eugene-desk.vercel.app"), "");
  assert.equal(publicAppHost("evil.vercel.app"), "");
});

test("app touch icon is preserved without injecting a competing icon", () => {
  for (const link of [
    '<link rel="apple-touch-icon" sizes="180x180" href="/brand/apple-touch-icon.png?v=2"/>',
    "<link href='/brand/apple-touch-icon.png?v=2' rel='apple-touch-icon'>",
  ]) {
    const out = injectGrokPwaHead(`<html><head>${link}</head></html>`, {host: "eugene-desk.vercel.app"});
    assert.equal((out.match(/rel=["']apple-touch-icon["']/g) || []).length, 1);
    assert.doesNotMatch(out, /href="\/__grok\/icon-180.png"/);
    assert.match(out, /grok-app-builder\/extensions\.js/);
  }
});

test("Eugene emits accessible absolute share images", () => {
  const out = injectGrokPwaHead("<html><head></head></html>", {host: "eugene-desk.vercel.app"});
  assert.match(out, /property="og:image" content="https:\/\/eugene-desk.vercel.app\/og.jpg"/);
  assert.match(out, /name="twitter:image" content="https:\/\/eugene-desk.vercel.app\/og.jpg"/);
});

test("Eugene install manifest uses its own name and Open E icon", () => {
  const manifest = JSON.parse(renderWebManifest("eugene-desk.vercel.app"));
  assert.equal(manifest.name, "Eugene Desk");
  assert.equal(manifest.icons[0].src, "/brand/apple-touch-icon.png?v=2");
  assert.equal(JSON.parse(renderWebManifest("demo.grok.me")).icons[0].src, "/__grok/icon-180.png");
});
