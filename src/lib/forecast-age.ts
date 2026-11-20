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
