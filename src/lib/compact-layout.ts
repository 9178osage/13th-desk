/**
 * The phone layout breakpoint, the same one styles.css uses to hide the sidebar and show
 * the footer's compact backup controls (`@media (max-width: 767px)`).
 */
export const COMPACT_QUERY = "(max-width: 767px)";

export function subscribeCompactLayout(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(COMPACT_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function compactLayoutNow(): boolean | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null;
  return window.matchMedia(COMPACT_QUERY).matches;
}

/** The server cannot know the viewport: render both copies and let CSS pick. */
export function compactLayoutOnServer(): boolean | null {
  return null;
}

/**
 * Which backup controls to mount. Once the browser knows the layout only the visible copy
 * is mounted, so there is one set of dialogs, listeners and messages instead of a hidden
 * twin (audit 2026-11-28 P2-09). Before that (server render and hydration) both are
 * rendered and CSS hides one, so the first paint never shifts.
 */
export function backupSlots(compact: boolean | null): { sidebar: boolean; footer: boolean } {
  return { sidebar: compact !== true, footer: compact !== false };
}
