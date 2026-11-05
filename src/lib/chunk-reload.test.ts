import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  installChunkReload,
  isMissingChunk,
  RELOAD_KEY_PREFIX,
  reloadForMissingChunk,
  type ChunkReloadHost,
} from "./chunk-reload.ts";

const CHROMIUM = new TypeError(
  "Failed to fetch dynamically imported module: https://example.com/assets/es-old.js",
);

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  };
}

function env(
  overrides: {
    online?: boolean;
    storage?: ReturnType<typeof memoryStorage> | null;
    confirmed?: boolean;
  } = {},
) {
  const storage = overrides.storage === undefined ? memoryStorage() : overrides.storage;
  let reloads = 0;
  let prompts = 0;
  return {
    storage,
    online: overrides.online ?? true,
    confirmReload: () => {
      prompts++;
      return overrides.confirmed ?? true;
    },
    reload: () => void reloads++,
    get prompts() {
      return prompts;
    },
    get reloads() {
      return reloads;
    },
  };
}

test("recognizes missing-chunk errors from every engine and Vite's CSS preload", () => {
  assert.ok(isMissingChunk(CHROMIUM));
  assert.ok(isMissingChunk(new TypeError("error loading dynamically imported module: x.js")));
  assert.ok(isMissingChunk(new TypeError("Importing a module script failed.")));
  assert.ok(isMissingChunk(new Error("Unable to preload CSS for /assets/x.css")));
  assert.ok(!isMissingChunk(new TypeError("drawLockScreen is not a function")));
  assert.ok(!isMissingChunk("Failed to fetch dynamically imported module"));
  assert.ok(!isMissingChunk(undefined));
});

test("reloads once per missing chunk, then lets the error through", () => {
  const e = env();
  assert.equal(reloadForMissingChunk(CHROMIUM, e), true);
  assert.equal(e.reloads, 1);
  assert.equal(e.storage?.items.get(RELOAD_KEY_PREFIX + CHROMIUM.message), "1");
  // After the reload the same chunk is still gone: no loop.
  assert.equal(reloadForMissingChunk(CHROMIUM, e), false);
  assert.equal(e.reloads, 1);
  // A different chunk (a later deploy) still gets its one reload.
  const other = new TypeError("Failed to fetch dynamically imported module: /assets/ko-old.js");
  assert.equal(reloadForMissingChunk(other, e), true);
  assert.equal(e.reloads, 2);
});

test("a refused reload stays refused, including TanStack's fallback", () => {
  const e = env({ confirmed: false });
  assert.equal(reloadForMissingChunk(CHROMIUM, e), false);
  assert.equal(e.reloads, 0);
  assert.equal(e.prompts, 1);
  assert.equal(e.storage?.items.get(RELOAD_KEY_PREFIX + CHROMIUM.message), "1");
  assert.equal(reloadForMissingChunk(CHROMIUM, e), false);
  assert.equal(e.prompts, 1);
  assert.equal(e.reloads, 0);
});

test("never reloads for ordinary errors, offline, or without a loop guard", () => {
  const ordinary = env();
  assert.equal(reloadForMissingChunk(new Error("boom"), ordinary), false);
  const offline = env({ online: false });
  assert.equal(reloadForMissingChunk(CHROMIUM, offline), false);
  const noStorage = env({ storage: null });
  assert.equal(reloadForMissingChunk(CHROMIUM, noStorage), false);
  const throwing = env();
  throwing.storage!.setItem = () => {
    throw new DOMException("quota", "QuotaExceededError");
  };
  assert.equal(reloadForMissingChunk(CHROMIUM, throwing), false);
  assert.equal(ordinary.reloads + offline.reloads + noStorage.reloads + throwing.reloads, 0);
  assert.equal(ordinary.prompts + offline.prompts + noStorage.prompts + throwing.prompts, 0);
});

test("installChunkReload listens for vite:preloadError until disposed", () => {
  const target = new EventTarget();
  const storage = memoryStorage();
  let reloads = 0;
  const host: ChunkReloadHost = {
    addEventListener: (type, listener) => target.addEventListener(type, listener),
    removeEventListener: (type, listener) => target.removeEventListener(type, listener),
    sessionStorage: storage,
    navigator: { onLine: true },
    location: { reload: () => void reloads++ },
    confirm: (message) => {
      assert.equal(message, "Reload? Unsaved input will be lost.");
      return true;
    },
  };
  const fire = (payload: unknown) => {
    const event = Object.assign(new Event("vite:preloadError", { cancelable: true }), { payload });
    target.dispatchEvent(event);
    return event;
  };
  const dispose = installChunkReload(host, "Reload? Unsaved input will be lost.");
  const event = fire(CHROMIUM);
  assert.equal(reloads, 1);
  // Vite still rethrows, so callers' own error handling keeps working.
  assert.equal(event.defaultPrevented, false);
  dispose();
  fire(new TypeError("Failed to fetch dynamically imported module: /assets/vi-old.js"));
  assert.equal(reloads, 1);
});

test("the shared loop-guard key still matches TanStack Router's lazyRouteComponent", () => {
  const source = readFileSync(
    new URL(
      "../../node_modules/@tanstack/react-router/dist/esm/lazyRouteComponent.js",
      import.meta.url,
    ),
    "utf8",
  );
  assert.ok(
    source.includes("`" + RELOAD_KEY_PREFIX + "${error.message}`"),
    "TanStack changed its reload key; update RELOAD_KEY_PREFIX",
  );
});
