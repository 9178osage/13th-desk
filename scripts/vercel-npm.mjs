import { spawnSync } from "node:child_process";
import { exitStatusFromChild } from "./with-app-env.mjs";

const env = { ...process.env };
// Vercel injects this pnpm cache setting into npm builds. npm only supports `cache`.
const removed = Object.keys(env).filter((key) => key.toLowerCase() === "npm_config_cache_dir");
for (const key of removed) delete env[key];
if (removed.length) {
  console.info(`[vercel-npm] Removed unsupported build environment setting: ${removed.join(", ")}`);
}

const result = spawnSync("npm", process.argv.slice(2), { env, stdio: "inherit" });
if (result.error) {
  console.error(`[vercel-npm] Failed to start npm: ${result.error.message}`);
  process.exitCode = 1;
} else {
  process.exitCode = exitStatusFromChild(result.status, result.signal);
}
