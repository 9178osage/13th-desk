// Audit 2026-11-27 P1-03 (dev server exposure) and P2-10 (WebKit + HTTP preview).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import picomatch from "picomatch";
import {
  DEV_FS_DENY,
  VITE_DEFAULT_DENY,
  devHost,
  previewContentSecurityPolicy,
} from "./dev-server-policy.mjs";

const root = join(import.meta.dirname, "..");

test("a personal checkout listens on loopback; the sandbox and an explicit opt-in on all interfaces", () => {
  assert.equal(devHost({}, "/Users/zihaoma/Desktop/Eugene Student Web"), "127.0.0.1");
  assert.equal(devHost({}, "/workspace/ed-fix"), "127.0.0.1");
  assert.equal(devHost({}, "/workspace"), "0.0.0.0", "App Builder live preview (AGENTS.md §0)");
  assert.equal(devHost({}, "/workspace/"), "0.0.0.0");
  assert.equal(devHost({ EUGENE_DEV_HOST: "0.0.0.0" }, "/Users/x/app"), "0.0.0.0");
  assert.equal(devHost({ EUGENE_DEV_HOST: "127.0.0.1" }, "/workspace"), "127.0.0.1");
  assert.equal(devHost({ EUGENE_DEV_HOST: "  " }, "/Users/x/app"), "127.0.0.1");
});

test("package scripts: dev binds by policy, dev:network opts in, startup.sh keeps the preview", () => {
  const scripts = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts;
  assert.doesNotMatch(scripts.dev, /--host/, "no hard-coded 0.0.0.0 in npm run dev");
  assert.match(scripts.dev, /--port 8080/);
  assert.match(scripts["dev:local"], /--host 127\.0\.0\.1/);
  assert.match(scripts["dev:network"], /EUGENE_DEV_HOST=0\.0\.0\.0/);
  const startup = readFileSync(join(root, "startup.sh"), "utf8");
  assert.match(startup, /EUGENE_DEV_HOST=0\.0\.0\.0 npm run dev/);
  const config = readFileSync(join(root, "vite.config.ts"), "utf8");
  assert.match(config, /host: devHost\(\)/);
  assert.match(config, /deny: DEV_FS_DENY/);
});

test("fs.deny keeps every default of the installed Vite, first and verbatim", () => {
  assert.deepEqual(DEV_FS_DENY.slice(0, VITE_DEFAULT_DENY.length), VITE_DEFAULT_DENY);
  // Read the defaults from the installed Vite itself so an upgrade that adds one fails here.
  const chunks = join(root, "node_modules", "vite", "dist", "node", "chunks");
  const source = readdirSync(chunks)
    .filter((name) => name.endsWith(".js"))
    .map((name) => readFileSync(join(chunks, name), "utf8"))
    .find((text) => /fs:\s*\{\s*strict:\s*true,\s*deny:\s*\[/.test(text));
  assert.ok(source, "found Vite's server.fs defaults");
  const block = /fs:\s*\{\s*strict:\s*true,\s*deny:\s*\[([^\]]*)\]/.exec(source)[1];
  const upstream = [...block.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(upstream.length >= 4);
  for (const pattern of upstream) assert.ok(DEV_FS_DENY.includes(pattern), `missing ${pattern}`);
});

test("private local folders and secrets are denied; app sources are not", () => {
  // Same matching Vite uses: patterns without "/" match at any depth.
  const isDenied = picomatch(
    DEV_FS_DENY.map((pattern) => (pattern.includes("/") ? pattern : `**/${pattern}`)),
    { matchBase: false, dot: true },
  );
  const base = "/Users/me/Desktop/Eugene Student Web";
  for (const file of [
    ".env",
    ".env.local",
    "certs/dev.key",
    "id.p12",
    ".npmrc",
    ".yarnrc.yml",
    ".git/config",
    "artifacts/README.md",
    "artifacts/delivery/old.zip",
    "verification/attachments/report.md",
    "eugene-desk-all-code/1-app-code-1.txt",
    "申请材料/cv.pdf",
    "Eugene Desk Logo/logo.ai",
    "海报/poster-zh.png",
    "backup.zip",
  ]) {
    assert.ok(isDenied(`${base}/${file}`), `${file} must be denied`);
  }
  for (const file of ["src/routes/index.tsx", "public/favicon.svg", "src/styles.css"]) {
    assert.ok(!isDenied(`${base}/${file}`), `${file} must stay servable`);
  }
});

test("the HTTP preview drops only upgrade-insecure-requests; production keeps it", () => {
  const vercel = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
  const production = vercel.headers
    .flatMap((rule) => rule.headers)
    .find((header) => header.key === "Content-Security-Policy").value;
  assert.match(production, /upgrade-insecure-requests/, "deployed site still upgrades");
  const preview = previewContentSecurityPolicy(production);
  assert.doesNotMatch(preview, /upgrade-insecure-requests/);
  const directives = (policy) =>
    policy
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean);
  assert.deepEqual(
    directives(preview),
    directives(production).filter((part) => part !== "upgrade-insecure-requests"),
  );
  assert.equal(previewContentSecurityPolicy(undefined), undefined);
});
