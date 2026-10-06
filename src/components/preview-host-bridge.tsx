/**
 * Mount once in `__root.tsx` so the Grok preview chrome can drive navigation
 * (and later receive registered routes). Noops when the app is not embedded.
 *
 * The bridge code (and its zod schemas, ~22 kB gzip) only downloads when the
 * page is actually framed. A top-level page — the deployed site, an export, a
 * local dev server — is exactly the case `installPreviewHostBridge` already
 * treats as a no-op (`resolveParentEmbedderOrigin` returns null when the
 * parent is the page itself), so behavior is unchanged.
 */

import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

export function PreviewHostBridge() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return;
    let dispose: (() => void) | null = null;
    let cancelled = false;
    void import("@/lib/preview-host-bridge")
      .then(({ collectRoutePathsFromTree, installPreviewHostBridge }) => {
        if (cancelled) return;
        dispose = installPreviewHostBridge({
          navigate: (path) => {
            router.history.push(path);
          },
          getRoutePaths: () => collectRoutePathsFromTree(router.routeTree),
        });
      })
      .catch(() => {
        /* preview chrome is optional; the app works without it */
      });
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [router]);

  return null;
}
