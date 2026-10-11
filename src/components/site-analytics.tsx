/**
 * Vercel Web Analytics: anonymous, cookieless page counts. No custom events,
 * no query strings, nothing stored in localStorage by us.
 *
 * - Auto-tracking is off; every pageview is sent here with an explicit path,
 *   so a channel entry (/card, /isa, …) is counted as that path even though
 *   the address bar is then switched to "/" (the script would otherwise read
 *   location.href whenever it finishes loading).
 * - Calls are queued in `window.vaq` right away; the ~4 kB script itself is
 *   injected after the page is idle, so it never competes with first paint.
 * - Nothing loads in dev or inside a framed preview.
 */
import { useEffect, useRef } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { inject, pageview } from "@vercel/analytics";
import { channelEntry } from "@/lib/channels";

type VaWindow = Window & { va?: (...args: unknown[]) => void; vaq?: unknown[][] };

let started = false;
function startAnalytics(): boolean {
  if (!import.meta.env.PROD || typeof window === "undefined" || window.self !== window.top)
    return false;
  if (started) return true;
  started = true;
  const w = window as VaWindow;
  w.va ??= (...args: unknown[]) => {
    (w.vaq ??= []).push(args);
  };
  const load = () => inject({ mode: "production", disableAutoTrack: true });
  if ("requestIdleCallback" in window) window.requestIdleCallback(load, { timeout: 4000 });
  else setTimeout(load, 1500);
  return true;
}

export function SiteAnalytics() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const skipHome = useRef(false);

  useEffect(() => {
    const entry = channelEntry(pathname);
    if (skipHome.current && pathname === "/") {
      // The replace below; already counted as the channel path.
      skipHome.current = false;
      return;
    }
    const path = entry?.record ?? pathname;
    if (startAnalytics()) pageview({ path, route: path });
    if (entry) {
      skipHome.current = true;
      void router.navigate({ to: entry.then, replace: true, resetScroll: false });
    }
  }, [pathname, router]);

  return null;
}
