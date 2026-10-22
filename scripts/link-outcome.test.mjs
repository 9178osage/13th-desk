import assert from "node:assert/strict";
import { test } from "node:test";
import { describeError, isTimeoutError, outcomeFromAttempts } from "./link-outcome.mjs";

const fetchFailed = (code) =>
  Object.assign(new TypeError("fetch failed"), { cause: Object.assign(new Error(code), { code }) });
const named = (name) => Object.assign(new Error(name), { name });

test("undici and socket timeout codes are timeouts, in any case", () => {
  for (const code of [
    "UND_ERR_CONNECT_TIMEOUT",
    "UND_ERR_HEADERS_TIMEOUT",
    "UND_ERR_BODY_TIMEOUT",
    "ETIMEDOUT",
    "und_err_connect_timeout",
  ]) {
    assert.equal(isTimeoutError(fetchFailed(code)), true, code);
    assert.equal(describeError(fetchFailed(code)), "timeout", code);
  }
});

test("TimeoutError and AbortError are timeouts, directly or as the cause", () => {
  for (const name of ["TimeoutError", "AbortError", "timeouterror"]) {
    assert.equal(isTimeoutError(named(name)), true, name);
    assert.equal(isTimeoutError(Object.assign(new Error("x"), { cause: named(name) })), true, name);
  }
});

test("DNS failures, refused connections and plain errors are not timeouts", () => {
  for (const code of ["ENOTFOUND", "ECONNREFUSED", "ECONNRESET", "EAI_AGAIN"]) {
    assert.equal(isTimeoutError(fetchFailed(code)), false, code);
    assert.equal(describeError(fetchFailed(code)), code);
  }
  assert.equal(isTimeoutError(new Error("boom")), false);
  assert.equal(isTimeoutError(undefined), false);
});

test("outcome is timeout only when every attempt timed out", () => {
  assert.equal(outcomeFromAttempts(["timeout", "timeout"]), "timeout");
  assert.equal(outcomeFromAttempts(["timeout", "ENOTFOUND"]), "fail");
  assert.equal(outcomeFromAttempts(["ENOTFOUND", "ENOTFOUND"]), "fail");
  assert.equal(outcomeFromAttempts([]), "fail");
});
