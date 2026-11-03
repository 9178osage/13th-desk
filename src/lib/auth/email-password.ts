import type { SendVerificationEmail } from "./auth-config";

/**
 * Local email/password sign-in (this app's Better Auth DB — not the broker).
 *
 * Off, and it cannot simply be switched on (audit S6). With password sign-up on,
 * someone could register a victim's email first; a later Google/X sign-in would
 * merge into that account. So `server.ts` (via `passwordAuthSettings`) forces
 * email verification on sign-up AND `requireLocalEmailVerified` on account
 * linking, and refuses to start unless `sendVerificationEmail` below is a real
 * mail sender. No mail service is wired, so turning on `emailAndPasswordEnabled`
 * alone throws at startup. Wire a sender first, then flip the flag.
 */
export const emailAndPasswordEnabled = false;

/** Verification-mail sender required by password sign-up. None is wired. */
export const sendVerificationEmail: SendVerificationEmail | undefined = undefined;
