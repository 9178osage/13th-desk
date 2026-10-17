import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { rolldown } from "rolldown";

let bridgeCode;
before(async () => {
  const bundle = await rolldown({
    input: fileURLToPath(new URL("../src/lib/preview-host-bridge.ts", import.meta.url)),
    platform: "node",
    tsconfig: fileURLToPath(new URL("../tsconfig.json", import.meta.url)),
  });
  try {
    const output = await bundle.generate({ format: "cjs", codeSplitting: false });
    bridgeCode = output.output.find((item) => item.type === "chunk").code;
  } finally {
    await bundle.close();
  }
});

function fakeFrame({
  parentOrigin = "https://attacker.example",
  referrer = `${parentOrigin}/embed`,
  ancestorOrigin = parentOrigin,
  guestHostname = "demo.grok-sandbox.com",
  topLevel = false,
} = {}) {
  const posts = [];
  const navigations = [];
  const historyCalls = [];
  const events = [];
  const listeners = new Map();
  const pending = [];
  const parent = { postMessage: (message, origin) => posts.push({ message, origin }) };
  const url = new URL(`https://${guestHostname}/town?q=private-search#private-fragment`);
  const location = {
    hostname: url.hostname,
    origin: url.origin,
    href: url.href,
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
    ancestorOrigins: ancestorOrigin ? [ancestorOrigin] : [],
  };
  const history = {
    state: null,
    length: 1,
    pushState(data, unused, path) {
      history.state = data;
      historyCalls.push(["push", path]);
    },
    replaceState(data, unused, path) {
      history.state = data;
      historyCalls.push(["replace", path]);
    },
    go: (delta) => historyCalls.push(["go", delta]),
  };
  const window = {
    parent,
    location,
    history,
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener: (type, listener) => listeners.get(type)?.delete(listener),
    dispatchEvent: (event) => events.push(event.type),
  };
  if (topLevel) window.parent = window;
  const module = { exports: {} };
  runInNewContext(bridgeCode, {
    module,
    exports: module.exports,
    require: createRequire(import.meta.url),
    window,
    location,
    document: { referrer },
    URL,
    Event,
    queueMicrotask: (fn) => pending.push(fn),
  });
  return {
    api: module.exports,
    posts,
    navigations,
    historyCalls,
    events,
    history,
    listeners,
    install() {
      return module.exports.installPreviewHostBridge({
        navigate: (path) => navigations.push(path),
        getRoutePaths: () => ["/", "/town", "/gpa"],
      });
    },
    send(type, payload = {}, { origin = parentOrigin, source = parent } = {}) {
      const data = { channel: "grok-preview-bridge", version: 1, type, ...payload };
      for (const listener of listeners.get("message") ?? []) listener({ data, origin, source });
      while (pending.length) pending.shift()();
    },
  };
}

test("resolver preserves HTTP(S) Grok and loopback parents", () => {
  const { resolveParentEmbedderOrigin } = fakeFrame().api;
  for (const parent of [
    "https://grok.com/chat",
    "http://dev.grok.com:8080/chat",
    "https://GROK.COM/chat",
    "http://localhost:8080/",
    "https://127.0.0.1:9443/",
    "http://[::1]:8080/",
  ]) {
    assert.equal(
      resolveParentEmbedderOrigin(false, parent, null, "demo.grok-sandbox.com"),
      new URL(parent).origin,
      parent,
    );
  }
});

test("resolver preserves only exact remint parent pairs", () => {
  const { resolveParentEmbedderOrigin: resolve } = fakeFrame().api;
  for (const parent of ["https://example.test", "https://grok.example.test:8443"]) {
    assert.equal(resolve(false, parent, null, "demo.preview.example.test"), parent);
  }
  assert.equal(
    resolve(false, "https://GROK.EXAMPLE.TEST", null, "DEMO.PREVIEW.EXAMPLE.TEST"),
    "https://grok.example.test",
  );
  for (const [guest, parent] of [
    ["demo.preview.example.test", "https://other.example.test"],
    ["demo.preview.example.test", "https://example.test.attacker.example"],
    ["two.labels.preview.example.test", "https://example.test"],
    [".preview.example.test", "https://example.test"],
    ["preview.example.test", "https://example.test"],
    ["demo.preview.invalid", "https://invalid"],
  ]) {
    assert.equal(resolve(false, parent, null, guest), null, `${guest} / ${parent}`);
  }
});

test("sandbox hostnames never authorize arbitrary or spoofed parents", () => {
  const { resolveParentEmbedderOrigin: resolve } = fakeFrame().api;
  for (const guest of ["grok-sandbox.com", "demo.grok-sandbox.com", "eugene-desk.vercel.app"]) {
    for (const parent of [
      "https://attacker.example",
      "https://grok.com.attacker.example",
      "https://localhost.attacker.example",
      "https://grok.com@attacker.example",
      "data:text/html,hello",
      "file:///grok.com",
      "javascript:alert(1)",
      "null",
      "",
    ]) {
      assert.equal(resolve(false, parent, null, guest), null, `${guest} / ${parent}`);
      assert.equal(resolve(false, "", parent, guest), null, `ancestor: ${guest} / ${parent}`);
    }
  }
});

test("resolver keeps trusted ancestor fallback, schemeless hosts and top-level no-op", () => {
  const { resolveParentEmbedderOrigin: resolve } = fakeFrame().api;
  assert.equal(
    resolve(false, "https://attacker.example", "https://grok.com", "demo.grok-sandbox.com"),
    "https://grok.com",
  );
  assert.equal(resolve(false, "grok.com/chat"), "https://grok.com");
  assert.equal(
    resolve(true, "https://grok.com", "https://grok.com", "demo.grok-sandbox.com"),
    null,
  );
});

test("the actual parent origin takes precedence over a stale trusted referrer", () => {
  for (const ancestor of [
    "https://attacker.example",
    "null",
    "https://grok.com.attacker.example",
  ]) {
    const frame = fakeFrame({ parentOrigin: ancestor, referrer: "https://grok.com/chat" });
    assert.equal(frame.api.resolveCurrentEmbedderOrigin(), null);
    frame.install();
    frame.send("navigate", { path: "/gpa" });
    assert.deepEqual(frame.posts, []);
    assert.deepEqual(frame.navigations, []);
    assert.equal(frame.listeners.size, 0);
  }
});

test("URL credentials cannot disguise a preview parent, while redacted referrers still work", () => {
  const { resolveParentEmbedderOrigin: resolve, isGrokEmbedderOrigin } = fakeFrame().api;
  for (const candidate of ["https://user:pass@grok.com/chat", "http://user@localhost:8080/"]) {
    assert.equal(isGrokEmbedderOrigin(candidate), false);
    assert.equal(resolve(false, candidate), null);
  }
  assert.equal(resolve(false, "", "https://grok.com"), "https://grok.com");
  assert.equal(resolve(false, "https://grok.com/chat", null), "https://grok.com");
});

for (const source of ["referrer", "ancestor"]) {
  test(`actual bridge under an untrusted ${source} discloses nothing and accepts no commands`, () => {
    const frame = fakeFrame(source === "ancestor" ? { referrer: "" } : { ancestorOrigin: null });
    const originalPush = frame.history.pushState;
    const originalReplace = frame.history.replaceState;
    const dispose = frame.install();
    try {
      frame.send("hello");
      frame.send("navigate", { path: "/gpa" });
      frame.send("history", { delta: 1 });
      frame.send("connector-token-ready");
      assert.deepEqual(frame.posts, []);
      assert.deepEqual(frame.navigations, []);
      assert.deepEqual(frame.historyCalls, []);
      assert.deepEqual(frame.events, []);
      assert.equal(frame.listeners.size, 0);
      assert.equal(frame.history.pushState, originalPush);
      assert.equal(frame.history.replaceState, originalReplace);
    } finally {
      dispose();
    }
  });
}

test("actual bridge preserves trusted handshakes and navigation with source/origin guards", () => {
  for (const [guestHostname, parentOrigin] of [
    ["demo.grok-sandbox.com", "https://grok.com"],
    ["demo.grok-sandbox.com", "http://localhost:8080"],
    ["demo.preview.example.test", "https://example.test"],
    ["demo.preview.example.test", "https://grok.example.test"],
  ]) {
    const frame = fakeFrame({ guestHostname, parentOrigin });
    const dispose = frame.install();
    try {
      assert.deepEqual(
        frame.posts.map((post) => post.message.type),
        ["location", "routes", "ready"],
      );
      assert.ok(frame.posts.every((post) => post.origin === parentOrigin));
      assert.equal(frame.posts[0].message.search, "?q=private-search");
      assert.equal(frame.posts[0].message.hash, "#private-fragment");
      const initialPosts = frame.posts.length;
      frame.send("hello", {}, { origin: "https://attacker.example" });
      frame.send("navigate", { path: "/gpa" }, { source: {} });
      frame.send("navigate", { path: "/gpa" }, { origin: "https://attacker.example" });
      frame.send("navigate", { version: 2, path: "/gpa" });
      frame.send("navigate", { path: "//attacker.example" });
      frame.send("navigate", { path: "/\\attacker.example" });
      assert.deepEqual(frame.navigations, []);
      // Valid envelopes with unsafe paths may still report the current location.
      assert.ok(frame.posts.slice(initialPosts).every((post) => post.origin === parentOrigin));
      frame.send("hello");
      assert.deepEqual(
        frame.posts.slice(-3).map((post) => post.message.type),
        ["location", "routes", "ready"],
      );
      frame.send("navigate", { path: "/gpa" });
      assert.deepEqual(frame.navigations, ["/gpa"]);
    } finally {
      dispose();
    }
    frame.send("navigate", { path: "/town" });
    assert.deepEqual(frame.navigations, ["/gpa"]);
    assert.ok([...frame.listeners.values()].every((listeners) => listeners.size === 0));
  }
});

test("actual bridge stays inactive in a top-level page", () => {
  const frame = fakeFrame({ parentOrigin: "https://grok.com", topLevel: true });
  const dispose = frame.install();
  assert.deepEqual(frame.posts, []);
  assert.deepEqual(frame.historyCalls, []);
  assert.equal(frame.listeners.size, 0);
  dispose();
});
