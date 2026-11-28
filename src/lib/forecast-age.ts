/** What `watchForecastAge` needs from the browser (injected so tests control time). */
export type ForecastAgeEnv = {
  now: () => number;
  setTimer: (run: () => void, ms: number) => unknown;
  clearTimer: (handle: unknown) => void;
  /** False while the tab is hidden: no request for a page nobody is looking at. */
  visible: () => boolean;
  /** Subscribe to "the visitor is back" (window focus, page becoming visible). */
  onWake: (run: () => void) => () => void;
};

export function forecastIsStale(fetchedAt: number, now: number, ttl: number): boolean {
  const age = now - fetchedAt;
  return age < 0 || age >= ttl;
}

/**
 * Calls `onStale` when a forecast shown on a page that stays open outlives its cache
 * window: once when the remaining time runs out (if the tab is visible), and whenever the
 * visitor comes back to the tab after that. Returns the cleanup.
 */
export function watchForecastAge(
  fetchedAt: number,
  ttl: number,
  onStale: () => void,
  env: ForecastAgeEnv,
): () => void {
  const check = () => {
    if (env.visible() && forecastIsStale(fetchedAt, env.now(), ttl)) onStale();
  };
  // A little past the deadline, so the cache check on refresh agrees it has expired.
  const wait = Math.max(0, fetchedAt + ttl - env.now()) + 250;
  const timer = env.setTimer(check, wait);
  const stop = env.onWake(check);
  return () => {
    env.clearTimer(timer);
    stop();
  };
}

/**
 * Whether a failed forecast request should show the error and "Try again". Only a card
 * that already shows a forecast keeps it quietly; the module-level cache does not count,
 * because an expired cached forecast is never put on screen (audit 2026-11-27 P2-03: the
 * card used to stay on "Checking the sky…" forever after returning past the cache window).
 */
export function weatherFailureShown(cardShowsForecast: boolean): boolean {
  return !cardShowsForecast;
}

/**
 * One forecast refresh at a time. Coming back to a tab fires both `focus` and
 * `visibilitychange`, and the cache timer can fire next to them; each used to start its
 * own request, the later one aborting the earlier (audit 2026-11-28 P2-03).
 */
export function createRefreshGate() {
  let pending = false;
  return {
    /** Mark a refresh as running; false when one already is (the caller then skips). */
    open(): boolean {
      if (pending) return false;
      pending = true;
      return true;
    },
    /** The refresh finished, failed or was cancelled. */
    close(): void {
      pending = false;
    },
    get pending(): boolean {
      return pending;
    },
  };
}

/** Fahrenheit (as Open-Meteo sends it) to a whole Celsius degree, from the unrounded value. */
export function fahrenheitToCelsius(f: number): number {
  return Math.round(((f - 32) * 5) / 9);
}
