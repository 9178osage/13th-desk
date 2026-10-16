/**
 * Temp directories for the Node test suites, removed when the test process exits.
 *
 * Every suite that needed a scratch tree called `mkdtempSync` on its own and never cleaned
 * up, so each `npm test` left nine directories behind in the system temp folder (they
 * accumulate quietly for months). Cleaning up in an `exit` handler rather than at the end
 * of each test also covers failing assertions and early throws, and `rmSync` is used
 * because nothing async may run during `exit`.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const created = new Set();
let registered = false;

export function tempDir(prefix) {
  if (!registered) {
    registered = true;
    process.on("exit", () => {
      for (const dir of created) {
        try {
          rmSync(dir, { recursive: true, force: true });
        } catch {
          /* a locked or already-removed path must not fail the run */
        }
      }
    });
  }
  const dir = mkdtempSync(join(tmpdir(), prefix));
  created.add(dir);
  return dir;
}

/** Remove one scratch tree early; safe to call twice. */
export function dropTempDir(dir) {
  created.delete(dir);
  rmSync(dir, { recursive: true, force: true });
}
