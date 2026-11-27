/**
 * Who can reach the local dev and preview servers, and which project files they may serve.
 *
 * Host. `npm run dev` listens on loopback (127.0.0.1) unless one of these says otherwise:
 * - `EUGENE_DEV_HOST` (e.g. `0.0.0.0` via `npm run dev:network`), always wins;
 * - the App Builder sandbox, whose live-preview proxy discovers `0.0.0.0:8080`
 *   (AGENTS.md §0). The sandbox runs the project from `/workspace` and its revive script
 *   (`startup.sh`) sets `EUGENE_DEV_HOST=0.0.0.0` too, so the preview keeps working.
 * A personal checkout (with private folders next to the code) is therefore never exposed
 * to the local network by default.
 *
 * Files. A custom `server.fs.deny` REPLACES Vite's defaults, so the list starts with every
 * default of the locked Vite version (checked by dev-server-policy.test.mjs against the
 * installed Vite) and then adds this project's private, local-only folders. Git ignore
 * rules do not limit what an HTTP server can read.
 */
import { resolve } from "node:path";

export const DEV_PORT = 8080;
export const SANDBOX_ROOT = "/workspace";

export function devHost(env = process.env, root = process.cwd()) {
  const explicit = typeof env.EUGENE_DEV_HOST === "string" ? env.EUGENE_DEV_HOST.trim() : "";
  if (explicit) return explicit;
  return resolve(root) === SANDBOX_ROOT ? "0.0.0.0" : "127.0.0.1";
}

/** Vite 8.3 `server.fs.deny` defaults (kept first, verbatim). */
export const VITE_DEFAULT_DENY = [
  ".env",
  ".env.*",
  "*.{crt,pem,key,p12,pfx,cer,der}",
  ".npmrc",
  ".yarnrc.yml",
  "**/.git/**",
];

export const DEV_FS_DENY = [
  ...VITE_DEFAULT_DENY,
  // Local-only material on the owner's Mac (all git-ignored; see .gitignore).
  "**/申请材料/**",
  "**/attachments/**",
  "**/artifacts/**",
  "**/verification/**",
  "**/eugene-desk-all-code/**",
  "**/Eugene Desk Logo/**",
  "**/海报/**",
  "*.zip",
  "**/.DS_Store",
  // Repo-internal files nobody needs from the dev server.
  "**/.grok/**",
  "**/.app-builder/**",
  "**/.vercel/**",
  "**/AGENTS.md",
  "**/*.md",
  "**/package-lock.json",
  "**/gh-push-args.json",
];

/**
 * The production CSP for `vite preview`. The preview only ever serves plain HTTP on
 * loopback, so `upgrade-insecure-requests` would make WebKit request every asset over
 * HTTPS from a server that has none (unstyled page, disabled buttons). Only that directive
 * is dropped, and only here; the deployed site keeps the policy from vercel.json as is.
 */
export function previewContentSecurityPolicy(policy) {
  if (typeof policy !== "string") return policy;
  return policy
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part && part.toLowerCase() !== "upgrade-insecure-requests")
    .join("; ");
}
