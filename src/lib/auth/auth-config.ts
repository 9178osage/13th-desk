/**
 * Pure auth-config resolution (no aliases, no Node-only imports) so it can be unit
 * tested and shared by `server.ts`, `gate-identity.server.ts` and `client.ts`.
 *
 * Audit S6: sign-in must stay off unless explicitly turned on, and when it is on in
 * production it must not silently fall back to insecure defaults (random per-process
 * secret, `http://localhost` base URL, loopback origins trusted in production).
 */

/** Env shape this module reads; empty/whitespace values count as unset. */
export type AuthEnv = Record<string, string | undefined>;

const LOCAL_DEV_ORIGINS = ["http://localhost:8080", "http://127.0.0.1:8080", "http://[::1]:8080"];

/** Minimum length for `BETTER_AUTH_SECRET` (Better Auth recommends 32+ random chars). */
export const MIN_AUTH_SECRET_LENGTH = 32;

/** Session lifetime: 7 days, refreshed at most once a day; cookie cache 5 minutes. */
export const AUTH_SESSION = {
  expiresIn: 60 * 60 * 24 * 7,
  updateAge: 60 * 60 * 24,
  cookieCache: { enabled: true, maxAge: 300 },
} as const;

/**
 * Rate limits for `/api/auth/*`. Enabled in every environment (Better Auth only
 * enables it in production by default). In-memory storage is per instance, so on
 * serverless it is a best-effort brake, not a global quota.
 */
export const AUTH_RATE_LIMIT = {
  enabled: true,
  window: 60,
  max: 60,
  customRules: {
    "/sign-in/*": { window: 60, max: 5 },
    "/sign-up/*": { window: 60, max: 3 },
    "/oauth2/*": { window: 60, max: 10 },
    "/callback/*": { window: 60, max: 10 },
  },
} as const;

function read(env: AuthEnv, key: string): string | undefined {
  const value = env[key]?.trim();
  return value ? value : undefined;
}

/**
 * The one flag predicate. Sign-in is on ONLY for the exact value `"true"`; unset,
 * empty, `"false"` or anything else keeps it off (fail closed).
 */
export function authFlagOn(value: string | undefined): boolean {
  return value?.trim() === "true";
}

/** True for a production server (Vercel production or NODE_ENV=production). */
export function isProductionEnv(env: AuthEnv): boolean {
  return read(env, "VERCEL_ENV") === "production" || read(env, "NODE_ENV") === "production";
}

/**
 * Problems that must be fixed before sign-in may run in production. Empty when the
 * flag is off (nothing to check) or outside production (preview/dev fallbacks OK).
 */
export function productionAuthProblems(env: AuthEnv): string[] {
  if (!authFlagOn(env.VITE_AUTH_ENABLED) || !isProductionEnv(env)) return [];
  const problems: string[] = [];
  const secret = read(env, "BETTER_AUTH_SECRET");
  if (!secret) problems.push("BETTER_AUTH_SECRET is not set");
  else if (secret.length < MIN_AUTH_SECRET_LENGTH)
    problems.push(`BETTER_AUTH_SECRET is shorter than ${MIN_AUTH_SECRET_LENGTH} characters`);
  const url = read(env, "BETTER_AUTH_URL");
  if (!url) problems.push("BETTER_AUTH_URL is not set");
  else if (!/^https:\/\//.test(url)) problems.push("BETTER_AUTH_URL must be an https:// URL");
  if (!read(env, "GROK_AUTH_CLIENT_ID") || !read(env, "GROK_AUTH_CLIENT_SECRET"))
    problems.push("GROK_AUTH_CLIENT_ID / GROK_AUTH_CLIENT_SECRET are not set");
  return problems;
}

/** Origins allowed on credentialed auth POSTs. Loopback origins only outside production. */
export function trustedOriginsFor(
  env: AuthEnv,
  explicitBaseURL: string | undefined,
  previewHosts: readonly string[],
): string[] {
  const local = isProductionEnv(env) ? [] : LOCAL_DEV_ORIGINS;
  if (explicitBaseURL) return [new URL(explicitBaseURL).origin, ...local];
  return [
    ...previewHosts,
    ...previewHosts.flatMap((host) => [`https://${host}`, `http://${host}`]),
    ...local,
  ];
}
