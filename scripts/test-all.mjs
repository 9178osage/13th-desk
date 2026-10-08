import { readdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const platformTest = "grok-pwa-plugin.test.mjs";
// Default OG identity must come from an empty fixture, not the live brand.
const fixture = mkdtempSync(join(tmpdir(), "eugene-test-identity-"));
const groups = [
  { cwd: root, args: ["--test", ...readdirSync(join(root, "scripts")).filter((name) => name.endsWith(".test.mjs") && name !== platformTest).map((name) => join(root, "scripts", name))] },
  { cwd: fixture, args: ["--test", join(root, "scripts", platformTest)] },
  { cwd: root, args: ["--experimental-strip-types", "--test", "src/lib/desk.test.ts", "src/lib/desk-storage.test.ts", "src/lib/app-data/app-data.test.ts", "src/lib/app-data/readiness-schedule.test.ts", "src/lib/auth/gate-identity.test.ts", "src/lib/auth/sign-in-gate.test.ts"] },
];
let failed = false;
for (const group of groups) {
  const result = spawnSync(process.execPath, group.args, { cwd: group.cwd, stdio: "inherit" });
  if (result.error) console.error(result.error);
  if (result.status !== 0) failed = true;
}
process.exitCode = failed ? 1 : 0;
