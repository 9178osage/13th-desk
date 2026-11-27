#!/usr/bin/env node
/**
 * Is the text-reader export (eugene-desk-all-code/, git-ignored, written by its own
 * sync.py) still the code at HEAD? Read-only: it never runs or edits sync.py and never
 * touches the volumes. Run it before handing the volumes to a reader.
 *
 * Checks every full-snapshot volume (`1-app-code-*.txt`, `2-tools-tests-*.txt`,
 * `3-docs-*.txt`): one commit in every header and it is HEAD; each group has parts 1..N
 * with none missing or repeated; no volume over 130,000 bytes; every file section
 * (`===== path =====`) appears once and is a file tracked at that commit.
 *
 * Usage: node scripts/reader-export-check.mjs [dir]   (default eugene-desk-all-code)
 * Exit: 0 current, 1 stale or malformed, 2 no export found.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

export const MAX_VOLUME_BYTES = 130_000;
const VOLUME_NAME = /^(\d-[a-z-]+)-(\d+)\.txt$/;
const COMMIT_LINE = /^# 提交：([0-9a-f]{7,40})/m;
const PART_LINE = /第 (\d+)\/(\d+) 部分/;
const SECTION = /^===== (.+) =====$/gm;

/** One volume's header facts and file sections. */
export function readVolume(name, text, bytes) {
  const match = VOLUME_NAME.exec(name);
  const part = PART_LINE.exec(text.split("\n").slice(0, 8).join("\n"));
  return {
    name,
    group: match?.[1] ?? null,
    commit: COMMIT_LINE.exec(text)?.[1] ?? null,
    part: part ? Number(part[1]) : null,
    parts: part ? Number(part[2]) : null,
    bytes,
    files: [...text.matchAll(SECTION)].map((m) => m[1]),
  };
}

/**
 * Problems with a set of volumes against HEAD. `tracked` is the set of paths tracked at
 * the export's commit (or null when that commit is unknown to this checkout).
 */
export function exportProblems(volumes, head, tracked = null) {
  const problems = [];
  if (volumes.length === 0) return ["no full-snapshot volumes found"];
  const commits = new Set(volumes.map((v) => v.commit));
  if (commits.has(null)) {
    const names = volumes.filter((v) => !v.commit).map((v) => v.name);
    problems.push(`no commit in the header of ${names.join(", ")}`);
  }
  const known = [...commits].filter(Boolean);
  if (known.length > 1) problems.push(`volumes disagree on the commit: ${known.join(", ")}`);
  for (const commit of known) {
    if (!head.startsWith(commit)) {
      problems.push(`export is from ${commit}, but HEAD is ${head.slice(0, 7)} — regenerate it`);
    }
  }
  const groups = new Map();
  for (const v of volumes) {
    if (v.bytes > MAX_VOLUME_BYTES) {
      problems.push(`${v.name} is ${v.bytes} bytes (limit ${MAX_VOLUME_BYTES})`);
    }
    if (!groups.has(v.group)) groups.set(v.group, []);
    groups.get(v.group).push(v);
  }
  for (const [group, list] of groups) {
    const totals = new Set(list.map((v) => v.parts));
    if (totals.size !== 1 || totals.has(null)) {
      problems.push(`${group}: volumes disagree on how many parts there are`);
      continue;
    }
    const [total] = totals;
    const seen = list.map((v) => v.part).sort((a, b) => a - b);
    const expected = Array.from({ length: total }, (_, i) => i + 1);
    if (seen.join() !== expected.join()) {
      problems.push(`${group}: has parts ${seen.join(",")} of ${total}`);
    }
  }
  const where = new Map();
  for (const v of volumes) {
    for (const file of v.files) {
      if (where.has(file)) problems.push(`${file} appears in ${where.get(file)} and ${v.name}`);
      else where.set(file, v.name);
      if (tracked && !tracked.has(file)) problems.push(`${file} (${v.name}) is not a tracked file`);
    }
  }
  return problems;
}

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
}

if (import.meta.main) {
  const root = resolve(import.meta.dirname, "..");
  const dir = resolve(root, process.argv[2] ?? "eugene-desk-all-code");
  if (!existsSync(dir)) {
    console.error(`no reader export at ${dir}`);
    process.exit(2);
  }
  const volumes = readdirSync(dir)
    .filter((name) => VOLUME_NAME.test(name))
    .sort()
    .map((name) => {
      const path = join(dir, name);
      return readVolume(name, readFileSync(path, "utf8"), statSync(path).size);
    });
  if (volumes.length === 0) {
    console.error(`no full-snapshot volumes in ${dir}`);
    process.exit(2);
  }
  const head = git(["rev-parse", "HEAD"], root).trim();
  const commit = volumes.find((v) => v.commit)?.commit;
  let tracked = null;
  let changed = [];
  try {
    tracked = new Set(git(["ls-tree", "-r", "--name-only", commit], root).split("\n"));
    changed = git(["diff", "--name-only", commit, "HEAD"], root).split("\n").filter(Boolean);
  } catch {
    // The export's commit is not in this checkout; the commit check below reports it.
  }
  const problems = exportProblems(volumes, head, tracked);
  const files = volumes.reduce((n, v) => n + v.files.length, 0);
  const largest = Math.max(...volumes.map((v) => v.bytes));
  console.log(
    `${volumes.length} volumes, ${files} files, largest ${largest} bytes, export ${commit ?? "?"}, HEAD ${head.slice(0, 7)}`,
  );
  if (changed.length > 0 && !head.startsWith(commit ?? "-")) {
    console.log(`${changed.length} tracked files changed since the export`);
  }
  for (const problem of problems) console.log(`  STALE/BAD  ${problem}`);
  if (problems.length === 0) console.log("  current: safe to hand to a reader");
  process.exit(problems.length === 0 ? 0 : 1);
}
