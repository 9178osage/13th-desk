import { useEffect } from "react";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { Shell } from "@/components/shell";
import { htmlLang, type Lang } from "@/lib/text";
import { DEFAULT_LANG, useDesk } from "@/lib/store";
import { deskBootScript } from "@/lib/boot-script";
import appCss from "../styles.css?url";
// Same hashed files the @font-face rules use; preloaded so text settles sooner.
import outfit400 from "@fontsource/outfit/files/outfit-latin-400-normal.woff2?url";
import fraunces500 from "@fontsource/fraunces/files/fraunces-latin-500-normal.woff2?url";

const APP_NAME = "Eugene Desk";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: `${APP_NAME} · Eugene` },
      {
        name: "description",
        content:
          "Eugene Desk — a free student desk for Eugene, Oregon: today's tasks, weekly schedule, campus and town places, school dates, and a GPA calculator. No account; everything stays in your browser.",
      },
      { name: "theme-color", content: "#f1ebe3" },
      { name: "referrer", content: "strict-origin-when-cross-origin" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "preload", href: outfit400, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
      {
        rel: "preload",
        href: fraunces500,
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/brand/apple-touch-icon.png" },
    ],
    scripts: [{ children: deskBootScript }],
  }),
  component: Root,
});

function Root() {
  useEffect(() => {
    const sync = (lang: Lang) => {
      if (typeof document === "undefined") return;
      document.documentElement.lang = htmlLang(lang);
    };
    sync(useDesk.getState().lang);
    // Only touch DOM when lang actually changes (persist writes touch other fields).
    return useDesk.subscribe((state, prev) => {
      if (state.lang !== prev.lang) sync(state.lang);
    });
  }, []);

  return (
    // Server HTML is rendered in the default language; boot-script.ts swaps in a
    // saved choice before paint and the effect above keeps it in sync.
    <html lang={htmlLang(DEFAULT_LANG)} className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-paper text-ink">
        <PreviewHostBridge />
        <AuthProvider>
          <Shell>
            <Outlet />
          </Shell>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
