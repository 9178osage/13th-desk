#!/usr/bin/env node
/**
 * Files this repository must not change by hand: platform-owned code (the Grok PWA
 * plugin, the Nitro server middleware, the preview-host bridge, site analytics) and the
 * static install assets under `public/__grok/`. `scripts/protected-files.json` records
 * the SHA-256 of every such file; `scripts/constraints.test.mjs` fails when a file is
 * edited, added or removed, so an accidental change cannot reach a deploy.
 *
 * If the platform itself ships a new version of one of these files, refresh the manifest
 * on purpose and say so in the commit: `node scripts/protected-files.mjs --write`.
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { isMainModule, projectRoot } from "./with-app-env.mjs";

/** Directories whose whole contents are protected. */
export const PROTECTED_DIRS = ["public/__grok", "server"];
/** Single protected files, or `prefix*` patterns inside one directory. */
export const PROTECTED_FILES = [
  "scripts/grok-pwa-*",
  "src/components/preview-host-bridge.tsx",
  "src/lib/preview-host-bridge.ts",
  "src/components/site-analytics.tsx",
];
export const MANIFEST_PATH = "scripts/protected-files.json";

function walk(root, dir, out) {
  for (const name of readdirSync(join(root, dir))) {
    const rel = `${dir}/${name}`;
    if (statSync(join(root, rel)).isDirectory()) walk(root, rel, out);
    else out.push(rel);
  }
}

/** Every protected file that exists now, as sorted repo-relative paths with `/`. */
export function listProtectedFiles(root = projectRoot()) {
  const out = [];
  for (const dir of PROTECTED_DIRS) walk(root, dir, out);
  for (const entry of PROTECTED_FILES) {
    if (!entry.endsWith("*")) {
      out.push(entry);
      continue;
    }
    const slash = entry.lastIndexOf("/");
    const dir = entry.slice(0, slash);
    const prefix = entry.slice(slash + 1, -1);
    for (const name of readdirSync(join(root, dir))) {
      if (name.startsWith(prefix)) out.push(`${dir}/${name}`);
    }
  }
  return [
    ...new Set(out.map((path) => relative(root, join(root, path)).split(sep).join("/"))),
  ].sort();
}

/** `{ path: sha256 }` for every protected file. */
export function hashProtectedFiles(root = projectRoot()) {
  const hashes = {};
  for (const path of listProtectedFiles(root)) {
    hashes[path] = createHash("sha256")
      .update(readFileSync(join(root, path)))
      .digest("hex");
  }
  return hashes;
}

export function readManifest(root = projectRoot()) {
  return JSON.parse(readFileSync(join(root, MANIFEST_PATH), "utf8"));
}

if (isMainModule(import.meta.url)) {
  const root = projectRoot();
  if (process.argv.includes("--write")) {
    writeFileSync(
      join(root, MANIFEST_PATH),
      `${JSON.stringify(hashProtectedFiles(root), null, 2)}\n`,
    );
    console.log(`[protected-files] wrote ${MANIFEST_PATH}`);
  } else {
    const expected = readManifest(root);
    const actual = hashProtectedFiles(root);
    const changed = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].filter(
      (path) => expected[path] !== actual[path],
    );
    if (changed.length) {
      console.error(`[protected-files] changed: ${changed.join(", ")}`);
      process.exitCode = 1;
    } else console.log(`[protected-files] ${Object.keys(actual).length} files unchanged`);
  }
}
