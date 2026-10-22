/**
 * Classify why a link probe threw, kept free of side effects so it can be unit-tested
 * (check-links.mjs starts probing as soon as it loads).
 *
 * A timeout is any abort/timeout error or any error code naming a timeout, in any case:
 * undici's UND_ERR_CONNECT_TIMEOUT / UND_ERR_HEADERS_TIMEOUT / UND_ERR_BODY_TIMEOUT,
 * ETIMEDOUT, etc. Those are retried once and tolerated up to the checker's limit.
 * DNS failures, refused connections and other errors stay hard failures.
 */
const TIMEOUT_NAMES = new Set(["timeouterror", "aborterror"]);

export function isTimeoutError(error) {
  if (!error || typeof error !== "object") return false;
  for (const candidate of [error, error.cause]) {
    if (!candidate || typeof candidate !== "object") continue;
    if (TIMEOUT_NAMES.has(String(candidate.name ?? "").toLowerCase())) return true;
    if (/timeout|timedout/i.test(String(candidate.code ?? ""))) return true;
  }
  return false;
}

/** One attempt's note: "timeout" for timeouts, otherwise the most specific cause. */
export function describeError(error) {
  if (isTimeoutError(error)) return "timeout";
  return String(error?.cause?.code ?? error?.code ?? error?.message ?? error);
}

/** Only attempts that all timed out count as a timeout; any other error fails. */
export function outcomeFromAttempts(attempts) {
  return attempts.length > 0 && attempts.every((note) => note === "timeout") ? "timeout" : "fail";
}
