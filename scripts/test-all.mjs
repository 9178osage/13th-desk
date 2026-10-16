import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { tempDir } from "./temp-dir.mjs";

const root = resolve(import.meta.dirname, "..");
const platformTest = "grok-pwa-plugin.test.mjs";
// Default OG identity must come from an empty fixture, not the live brand.
const fixture = tempDir("eugene-test-identity-");
const groups = [
  {
    // Formatting comes first: it is the fastest gate and it reports every offending
    // file at once. Skipped when prettier is not installed (a production-only
    // install has no devDependencies) so `npm test` never fails for a missing tool.
    cwd: root,
    skipIfMissing: join(root, "node_modules", ".bin", "prettier"),
    args: ["node_modules/.bin/prettier", "--check", "."],
    executable: process.execPath,
  },
  {
    cwd: root,
    args: [
      "--test",
      ...readdirSync(join(root, "scripts"))
        .filter((name) => name.endsWith(".test.mjs") && name !== platformTest)
        .map((name) => join(root, "scripts", name)),
    ],
  },
  { cwd: fixture, args: ["--test", join(root, "scripts", platformTest)] },
  {
    cwd: root,
    args: [
      "--experimental-strip-types",
      "--test",
      "src/lib/desk.test.ts",
      "src/lib/desk-storage.test.ts",
      "src/lib/merge3.test.ts",
      "src/lib/tab-presence.test.ts",
      "src/lib/channels.test.ts",
      "src/lib/app-data/app-data.test.ts",
      "src/lib/app-data/readiness-schedule.test.ts",
      "src/lib/auth/gate-identity.test.ts",
      "src/lib/auth/sign-in-gate.test.ts",
    ],
  },
];
let failed = false;
for (const group of groups) {
  if (group.skipIfMissing && !existsSync(group.skipIfMissing)) {
    console.log(`skipped (not installed): ${group.args.join(" ")}`);
    continue;
  }
  const command = group.executable ?? process.execPath;
  const result = spawnSync(command, group.args, { cwd: group.cwd, stdio: "inherit" });
  if (result.error) console.error(result.error);
  if (result.status !== 0) failed = true;
}
process.exitCode = failed ? 1 : 0;
