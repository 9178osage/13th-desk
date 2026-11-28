import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
// @ts-expect-error JS plugin alongside the TS vite config
import { grokPwaPlugin } from "./scripts/grok-pwa-plugin.mjs";
// @ts-expect-error JS plugin alongside the TS vite config
import { appEnvPlugin } from "./scripts/app-env-plugin.mjs";
import { isMigrationFile } from "./scripts/migration-plan.mjs";
import { authEnabledFromEnvValue } from "./scripts/check-auth-invariant.mjs";
import {
  DEV_FS_DENY,
  DEV_PORT,
  devHost,
  previewContentSecurityPolicy,
} from "./scripts/dev-server-policy.mjs";

/** The files `src/lib/db.ts` globs — same directory, same non-recursive scope. */
function hasGlobbedMigrations(root: string): boolean {
  try {
    return readdirSync(join(root, "migrations")).some(isMigrationFile);
  } catch {
    return false;
  }
}

/**
 * Finish PGLite bootstrap during dev-server setup (before traffic). Vite awaits
 * async `configureServer` hooks. Production: `src/lib/db` kicks `ensureDbReady`
 * on import.
 *
 * Vite awaiting the hook puts this on time-to-first-render, so an app with no
 * migrations — no schema to apply — skips it entirely rather than paying for a
 * PGLite instance it never queries.
 */
function pgliteBootstrapPlugin(): Plugin {
  return {
    name: "app-builder:pglite-bootstrap",
    apply: "serve",
    async configureServer(server) {
      if (!hasGlobbedMigrations(server.config.root)) return;
      try {
        const mod = (await server.ssrLoadModule("/src/lib/db.ts")) as {
          ensureDbReady?: () => Promise<void>;
        };
        if (typeof mod.ensureDbReady === "function") {
          await mod.ensureDbReady();
        }
      } catch (err) {
        console.error("[app-builder] DB bootstrap failed:", err);
        throw err;
      }
    },
  };
}

/**
 * Live-preview OAuth popup — handled HERE so the agent never has to create a
 * `/auth/popup` route (and cannot break it by scaffolding a React page that
 * paints the full app shell in the popup).
 *
 * `signIn` (client.ts) opens `/auth/popup?providerId=…` in a top-level window.
 * This middleware runs before TanStack Start, calls `handleAuthPopupRequest`,
 * and returns the 302 / completion HTML. Deployed apps do not use the popup
 * (full-page OAuth redirect), so `apply: "serve"` is enough.
 */
function authPopupPlugin(): Plugin {
  return {
    name: "app-builder:auth-popup",
    apply: "serve",
    configureServer(server) {
      // Auth is off (VITE_AUTH_ENABLED="false"): no popup handler, so `/auth/popup` is a
      // plain 404 in dev exactly as in the deployed build, and the dormant auth modules are
      // never loaded (audit 2026-11-28 P2-08).
      if (!authEnabledFromEnvValue(server.config.env.VITE_AUTH_ENABLED)) return;
      // Register immediately (not in a returned post-hook) so we run BEFORE
      // TanStack Start / the SPA HTML fallback. A model-authored
      // `src/routes/auth/popup.tsx` React page must never win this path.
      server.middlewares.use(async (req, res, next) => {
        try {
          const rawUrl = req.url ?? "";
          const pathOnly = rawUrl.split("?", 1)[0] ?? "";
          if (pathOnly !== "/auth/popup") {
            next();
            return;
          }
          if ((req.method ?? "GET").toUpperCase() !== "GET") {
            res.statusCode = 405;
            res.setHeader("content-type", "text/plain; charset=utf-8");
            res.end("Method Not Allowed");
            return;
          }

          const host = String(
            req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost:8080",
          );
          const proto = String(
            req.headers["x-forwarded-proto"] ??
              ((req.socket as { encrypted?: boolean } | undefined)?.encrypted ? "https" : "http"),
          );
          const requestHeaders = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (value === undefined) continue;
            if (Array.isArray(value)) {
              for (const v of value) requestHeaders.append(key, v);
            } else {
              requestHeaders.set(key, value);
            }
          }
          // Ensure Host is the public preview host so Better Auth's dynamic
          // baseURL / redirect_uri match the popup origin.
          if (!requestHeaders.has("host")) requestHeaders.set("host", host);

          const request = new Request(`${proto}://${host}${rawUrl}`, {
            method: "GET",
            headers: requestHeaders,
          });

          const mod = (await server.ssrLoadModule("/src/lib/auth/popup.server.ts")) as {
            handleAuthPopupRequest: (req: Request) => Promise<Response>;
          };
          const response = await mod.handleAuthPopupRequest(request);

          res.statusCode = response.status;
          // Preserve multiple Set-Cookie headers (OAuth state + session).
          const setCookies =
            typeof response.headers.getSetCookie === "function"
              ? response.headers.getSetCookie()
              : [];
          response.headers.forEach((value, key) => {
            if (key.toLowerCase() === "set-cookie") return;
            res.setHeader(key, value);
          });
          for (const cookie of setCookies) {
            res.appendHeader("set-cookie", cookie);
          }
          const body = Buffer.from(await response.arrayBuffer());
          res.end(body);
        } catch (err) {
          console.error("[app-builder] /auth/popup handler failed:", err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("content-type", "text/plain; charset=utf-8");
            res.end("auth popup failed");
          }
        }
      });
    },
  };
}

function securityHeadersPlugin(headers: Record<string, string>): Plugin {
  return {
    name: "app-builder:security-headers",
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
        next();
      });
    },
  };
}

// `0.0.0.0:8080` is the live-preview contract inside the App Builder sandbox — kept there
// (see scripts/dev-server-policy.mjs); a personal checkout listens on loopback by default.
// The dev server starts once `src/router.tsx` and `src/routes/` exist — see
// AGENTS.md § "First scaffold".
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(self), payment=(), usb=()",
  "X-Permitted-Cross-Domain-Policies": "none",
};

/** Production policy from vercel.json, so `vite preview` matches the deployed site. */
function productionContentSecurityPolicy(): string | undefined {
  const vercel = JSON.parse(readFileSync(new URL("./vercel.json", import.meta.url), "utf8")) as {
    headers: {
      has?: { type: string; value: string }[];
      headers: { key: string; value: string }[];
    }[];
  };
  // One CSP for every host: strict by default (S5). Preview reuses the same policy.
  const rule = vercel.headers.find((item) =>
    item.headers.some((header) => header.key === "Content-Security-Policy"),
  );
  return rule?.headers.find((header) => header.key === "Content-Security-Policy")?.value;
}

const previewSecurityHeaders = {
  ...securityHeaders,
  // Same policy as production, minus `upgrade-insecure-requests`: the preview is plain
  // HTTP on loopback, and WebKit would otherwise upgrade every asset to a missing HTTPS.
  "Content-Security-Policy":
    previewContentSecurityPolicy(productionContentSecurityPolicy()) ?? "frame-ancestors 'self'",
};

export default defineConfig(({ command, isPreview }) => ({
  server: {
    host: devHost(),
    port: DEV_PORT,
    strictPort: true,
    headers: securityHeaders,
    fs: {
      // Replaces Vite's defaults, so the list starts with all of them, then adds this
      // project's private, local-only folders (scripts/dev-server-policy.mjs).
      deny: DEV_FS_DENY,
    },
  },
  preview: {
    host: "127.0.0.1",
    port: 8081,
    strictPort: true,
    headers: previewSecurityHeaders,
  },
  resolve: { tsconfigPaths: true },
  plugins: [
    securityHeadersPlugin(securityHeaders),
    {
      name: "app-builder:preview-security-headers",
      configurePreviewServer(server) {
        server.middlewares.use((_req, res, next) => {
          for (const [key, value] of Object.entries(previewSecurityHeaders)) {
            res.setHeader(key, value);
          }
          next();
        });
      },
    },
    pgliteBootstrapPlugin(),
    // Before tanstackStart so /auth/popup never falls through to the SPA.
    authPopupPlugin(),
    // Dev-only /__app-env, read by scripts/check-auth-invariant.mjs.
    appEnvPlugin(),
    // PWA head + ?install=1 tutorial page; runs before Start/Nitro.
    grokPwaPlugin(),
    tailwindcss(),
    tanstackStart(),
    ...(command === "build" || isPreview
      ? [
          nitro({
            preset: "vercel",
            // Auto-registers server/middleware/* (the PWA install page +
            // manifest + head-tag middleware). Nitro v3 defaults serverDir to
            // false, so removing this silently unwires /?install=1 on deploys.
            serverDir: "./server",
            // Run the SSR function in Portland, next to Eugene (Vercel's
            // default is iad1, Washington D.C.). One region: fine on Hobby.
            // This Nitro version defaults to Node 24 even when built on Node 26.
            vercel: { functions: { regions: ["pdx1"], runtime: "nodejs26.x" } },
          }),
        ]
      : []),
    viteReact(),
  ],
}));
