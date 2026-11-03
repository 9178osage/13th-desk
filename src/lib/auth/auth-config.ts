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

/** Sends the verification mail for email/password sign-up (none is wired today). */
export type SendVerificationEmail = (data: {
  user: { email: string };
  url: string;
  token: string;
}) => Promise<void>;

export type PasswordAuthSettings = {
  /** Spread into `betterAuth({...})` only when password sign-up is on. */
  emailAndPassword?: { enabled: true; requireEmailVerification: true };
  emailVerification?: {
    sendOnSignUp: true;
    sendVerificationEmail: SendVerificationEmail;
  };
  /** `account.accountLinking.requireLocalEmailVerified`. */
  requireLocalEmailVerified: boolean;
};

/**
 * Audit S6: derive the email/password and account-linking settings together.
 *
 * - Password sign-up off (shipped): every local user comes from the broker, so
 *   linking does not gate on the local email-verified flag (X's platform-generated
 *   email is never "verified"; requiring it would break X sign-in).
 * - Password sign-up on: an attacker could pre-register the victim's email, and a
 *   later trusted-provider OAuth sign-in would merge into that account, mark the
 *   email verified and leave the attacker's password working. So BOTH sign-up email
 *   verification and `requireLocalEmailVerified` are forced on, and it throws at
 *   startup without a real `sendVerificationEmail` (no mail service is wired, so
 *   password sign-up cannot be turned on until one is).
 */
export function passwordAuthSettings(
  enabled: boolean,
  sendVerificationEmail: SendVerificationEmail | undefined,
): PasswordAuthSettings {
  if (!enabled) return { requireLocalEmailVerified: false };
  if (typeof sendVerificationEmail !== "function") {
    throw new Error(
      "[auth] email/password sign-up is enabled but no sendVerificationEmail is wired. " +
        "Sign-up must verify email before OAuth accounts can link (audit S6).",
    );
  }
  return {
    emailAndPassword: { enabled: true, requireEmailVerification: true },
    emailVerification: { sendOnSignUp: true, sendVerificationEmail },
    requireLocalEmailVerified: true,
  };
}

/** Throws when password sign-up is on while linking or sign-up skips email verification. */
export function assertSafeAccountLinking(options: {
  emailAndPassword?: { enabled?: boolean; requireEmailVerification?: boolean };
  account?: { accountLinking?: { requireLocalEmailVerified?: boolean } };
}): void {
  if (!options.emailAndPassword?.enabled) return;
  const linking = options.account?.accountLinking?.requireLocalEmailVerified ?? true;
  if (!linking || options.emailAndPassword.requireEmailVerification !== true) {
    throw new Error(
      "[auth] email/password sign-up requires requireEmailVerification and " +
        "accountLinking.requireLocalEmailVerified (audit S6).",
    );
  }
}

/**
 * Mirror of Better Auth 1.7.14's implicit-link decision in `oauth2/link-account.mjs`
 * (an OAuth sign-in meeting an existing user with the same email and no linked
 * account). True means the OAuth identity is merged into that existing user.
 */
export function wouldAutoLink(input: {
  trustedProvider: boolean;
  oauthEmailVerified: boolean;
  localEmailVerified: boolean;
  requireLocalEmailVerified: boolean;
}): boolean {
  if (!input.trustedProvider && !input.oauthEmailVerified) return false;
  if (input.requireLocalEmailVerified && !input.localEmailVerified) return false;
  return true;
}
