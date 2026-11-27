import assert from "node:assert/strict";
import test from "node:test";
import { MAX_VOLUME_BYTES, exportProblems, readVolume } from "./reader-export-check.mjs";

const HEAD = "73a5a78b4fbd14225f77d326989ba31fee023f62";

function volume(name, commit, part, parts, files, bytes = 1000) {
  const text = [
    "# 项目：Eugene Desk",
    `# 提交：${commit}（2026-11-27 10:00 -0800）`,
    "# 环境：…",
    `# 内容：${name} 应用代码，第 ${part}/${parts} 部分（${files.length} 个文件）`,
    "",
    ...files.flatMap((f) => [`===== ${f} =====`, "body", ""]),
  ].join("\n");
  return readVolume(name, text, bytes);
}

test("reads commit, part and file sections from a volume header", () => {
  const v = volume("1-app-code-2.txt", "a98680c", 2, 7, ["src/a.ts", "README.md"]);
  assert.equal(v.group, "1-app-code");
  assert.equal(v.commit, "a98680c");
  assert.equal(v.part, 2);
  assert.equal(v.parts, 7);
  assert.deepEqual(v.files, ["src/a.ts", "README.md"]);
});

test("a complete export at HEAD has no problems", () => {
  const vols = [
    volume("1-app-code-1.txt", "73a5a78", 1, 2, ["src/a.ts"]),
    volume("1-app-code-2.txt", "73a5a78", 2, 2, ["src/b.ts"]),
    volume("3-docs-1.txt", "73a5a78", 1, 1, ["README.md"]),
  ];
  assert.deepEqual(exportProblems(vols, HEAD, new Set(["src/a.ts", "src/b.ts", "README.md"])), []);
});

// Audit 2026-11-27 P3-03: volumes still said a98680c while HEAD had moved on.
test("an export from an older commit is reported as stale", () => {
  const vols = [volume("1-app-code-1.txt", "a98680c", 1, 1, ["src/a.ts"])];
  const problems = exportProblems(vols, HEAD);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /export is from a98680c, but HEAD is 73a5a78/);
});

test("mixed commits, missing parts, duplicates, oversize and untracked files are reported", () => {
  const vols = [
    volume("1-app-code-1.txt", "73a5a78", 1, 3, ["src/a.ts"]),
    volume("1-app-code-3.txt", "0754758", 3, 3, ["src/a.ts"], MAX_VOLUME_BYTES + 1),
    volume("3-docs-1.txt", "73a5a78", 1, 1, ["gone.md"]),
  ];
  const text = exportProblems(vols, HEAD, new Set(["src/a.ts"])).join("\n");
  assert.match(text, /disagree on the commit/);
  assert.match(text, /1-app-code: has parts 1,3 of 3/);
  assert.match(text, /src\/a\.ts appears in 1-app-code-1\.txt and 1-app-code-3\.txt/);
  assert.match(text, /is 130001 bytes/);
  assert.match(text, /gone\.md \(3-docs-1\.txt\) is not a tracked file/);
});

test("no volumes is a problem, not a pass", () => {
  assert.deepEqual(exportProblems([], HEAD), ["no full-snapshot volumes found"]);
});
