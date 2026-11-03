import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { emailAndPasswordEnabled, sendVerificationEmail } from "./email-password.ts";
import {
  AUTH_RATE_LIMIT,
  AUTH_SESSION,
  assertSafeAccountLinking,
  authFlagOn,
  passwordAuthSettings,
  wouldAutoLink,
  productionAuthProblems,
  trustedOriginsFor,
} from "./auth-config.ts";

const prodOn = {
  VITE_AUTH_ENABLED: "true",
  VERCEL_ENV: "production",
  BETTER_AUTH_SECRET: "x".repeat(40),
  BETTER_AUTH_URL: "https://eugene-desk.vercel.app",
  GROK_AUTH_CLIENT_ID: "id",
  GROK_AUTH_CLIENT_SECRET: "secret",
};

describe("audit S6: auth config", () => {
  it("is off unless the flag is exactly true", () => {
    for (const value of [undefined, "", "false", "TRUE", "1", "yes"]) {
      assert.equal(authFlagOn(value), false, String(value));
    }
    assert.equal(authFlagOn("true"), true);
    assert.equal(authFlagOn(" true "), true);
  });

  it("ships with sign-in off", () => {
    const appEnv = JSON.parse(
      readFileSync(join(import.meta.dirname, "..", "..", "..", ".grok", "app-env.json"), "utf8"),
    );
    assert.equal(appEnv.VITE_AUTH_ENABLED, "false");
  });

  it("refuses insecure production fallbacks when sign-in is on", () => {
    assert.deepEqual(productionAuthProblems(prodOn), []);
    const { BETTER_AUTH_SECRET: _s, ...noSecret } = prodOn;
    assert.match(productionAuthProblems(noSecret).join(), /BETTER_AUTH_SECRET is not set/);
    assert.match(
      productionAuthProblems({ ...prodOn, BETTER_AUTH_SECRET: "short" }).join(),
      /shorter than 32/,
    );
    const { BETTER_AUTH_URL: _u, ...noUrl } = prodOn;
    assert.match(productionAuthProblems(noUrl).join(), /BETTER_AUTH_URL is not set/);
    assert.match(
      productionAuthProblems({ ...prodOn, BETTER_AUTH_URL: "http://localhost:8080" }).join(),
      /https/,
    );
    const { GROK_AUTH_CLIENT_SECRET: _c, ...noClient } = prodOn;
    assert.match(productionAuthProblems(noClient).join(), /GROK_AUTH_CLIENT/);
  });

  it("does not block the shipped (off) site or local dev", () => {
    assert.deepEqual(
      productionAuthProblems({ VITE_AUTH_ENABLED: "false", VERCEL_ENV: "production" }),
      [],
    );
    assert.deepEqual(productionAuthProblems({ VERCEL_ENV: "production" }), []);
    assert.deepEqual(
      productionAuthProblems({ VITE_AUTH_ENABLED: "true", NODE_ENV: "development" }),
      [],
    );
  });

  it("trusts loopback origins only outside production", () => {
    const prod = trustedOriginsFor(
      { NODE_ENV: "production" },
      "https://eugene-desk.vercel.app/x",
      [],
    );
    assert.deepEqual(prod, ["https://eugene-desk.vercel.app"]);
    const dev = trustedOriginsFor({ NODE_ENV: "development" }, undefined, ["*.grok-sandbox.com"]);
    assert.ok(dev.includes("http://127.0.0.1:8080"));
    assert.ok(dev.includes("https://*.grok-sandbox.com"));
  });

  it("sets explicit session expiry and auth rate limits", () => {
    assert.equal(AUTH_SESSION.expiresIn, 604800);
    assert.ok(AUTH_SESSION.updateAge < AUTH_SESSION.expiresIn);
    assert.equal(AUTH_RATE_LIMIT.enabled, true);
    assert.ok(AUTH_RATE_LIMIT.customRules["/sign-in/*"].max <= 5);
  });

  it("server.ts wires the S6 guards in", () => {
    const server = readFileSync(join(import.meta.dirname, "server.ts"), "utf8");
    assert.match(server, /productionAuthProblems\(process\.env\)/);
    assert.match(server, /trustedOriginsFor\(/);
    assert.match(server, /rateLimit:/);
    assert.match(server, /authFlagOn\(env\("VITE_AUTH_ENABLED"\)\)/);
    assert.doesNotMatch(server, /LOCAL_DEV_ORIGINS\]/);
  });
});

describe("audit S6: password sign-up and account linking", () => {
  const sender = async () => {};
  // X / Grok broker sign-in: trusted provider, platform-generated email never verified.
  const xLogin = { trustedProvider: true, oauthEmailVerified: false };

  it("ships with password sign-up off and no mail sender", () => {
    assert.equal(emailAndPasswordEnabled, false);
    assert.equal(sendVerificationEmail, undefined);
  });

  it("password off: X sign-in still creates and links with its unverified email", () => {
    const settings = passwordAuthSettings(false, undefined);
    assert.equal(settings.requireLocalEmailVerified, false);
    assert.equal(settings.emailAndPassword, undefined);
    // An existing broker-created user (e.g. an earlier X login, never verified).
    assert.equal(
      wouldAutoLink({ ...xLogin, localEmailVerified: false, requireLocalEmailVerified: false }),
      true,
    );
  });

  it("password on without a verification sender throws at startup", () => {
    assert.throws(() => passwordAuthSettings(true, undefined), /sendVerificationEmail/);
  });

  it("password on forces sign-up verification and requireLocalEmailVerified", () => {
    const settings = passwordAuthSettings(true, sender);
    assert.equal(settings.requireLocalEmailVerified, true);
    assert.deepEqual(settings.emailAndPassword, { enabled: true, requireEmailVerification: true });
    assert.equal(settings.emailVerification?.sendOnSignUp, true);
    // The takeover: attacker pre-registers the victim's email (unverified), victim signs in with X.
    assert.equal(
      wouldAutoLink({ ...xLogin, localEmailVerified: false, requireLocalEmailVerified: true }),
      false,
    );
  });

  it("fails if password sign-up is on while linking or sign-up skips verification", () => {
    assert.throws(
      () =>
        assertSafeAccountLinking({
          emailAndPassword: { enabled: true, requireEmailVerification: true },
          account: { accountLinking: { requireLocalEmailVerified: false } },
        }),
      /audit S6/,
    );
    assert.throws(
      () =>
        assertSafeAccountLinking({
          emailAndPassword: { enabled: true },
          account: { accountLinking: { requireLocalEmailVerified: true } },
        }),
      /audit S6/,
    );
    assert.doesNotThrow(() =>
      assertSafeAccountLinking({
        emailAndPassword: { enabled: true, requireEmailVerification: true },
        account: { accountLinking: { requireLocalEmailVerified: true } },
      }),
    );
    assert.doesNotThrow(() =>
      assertSafeAccountLinking({
        account: { accountLinking: { requireLocalEmailVerified: false } },
      }),
    );
  });

  it("server.ts derives linking from the password settings and asserts it", () => {
    const server = readFileSync(join(import.meta.dirname, "server.ts"), "utf8");
    assert.match(server, /passwordAuthSettings\(emailAndPasswordEnabled, sendVerificationEmail\)/);
    assert.match(server, /requireLocalEmailVerified: passwordAuth\.requireLocalEmailVerified/);
    assert.match(server, /assertSafeAccountLinking\(authOptions\)/);
    assert.doesNotMatch(server, /requireLocalEmailVerified: (false|true)/);
    assert.doesNotMatch(server, /emailAndPassword: \{ enabled: true \}/);
  });

  it("wouldAutoLink mirrors the installed Better Auth link decision", () => {
    const source = readFileSync(
      join(
        import.meta.dirname,
        "..",
        "..",
        "..",
        "node_modules",
        "better-auth",
        "dist",
        "oauth2",
        "link-account.mjs",
      ),
      "utf8",
    );
    assert.match(
      source,
      /requireLocalEmailVerified = accountLinking\?\.requireLocalEmailVerified \?\? true/,
    );
    assert.match(
      source,
      /!isTrustedProvider && !userInfo\.emailVerified \|\| requireLocalEmailVerified && !dbUser\.user\.emailVerified/,
    );
  });
});
