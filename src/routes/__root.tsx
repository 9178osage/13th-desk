import { useEffect } from "react";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie, setResponseHeader } from "@tanstack/react-start/server";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { Shell } from "@/components/shell";
import { PACK_SCRIPT_ID, htmlLang, inlinePackJson, loadLangPack, type Lang } from "@/lib/text";
import { DEFAULT_LANG, DeskHintContext, useDesk } from "@/lib/store";
import { PREFS_COOKIE, parsePrefsValue, readPrefsCookie, type PrefsHint } from "@/lib/prefs-cookie";
import { deskBootScript } from "@/lib/boot-script";
import appCss from "../styles.css?url";
// Same hashed files the @font-face rules use. Preload every face the first
// screen paints with (Outfit 400/500, Fraunces 500/600) so they are usually
// ready by the first layout; laying out with pending web fonts means a slow
// fallback-font pass first and a second layout when they swap in.
import outfit400 from "@fontsource/outfit/files/outfit-latin-400-normal.woff2?url";
import outfit500 from "@fontsource/outfit/files/outfit-latin-500-normal.woff2?url";
import fraunces500 from "@fontsource/fraunces/files/fraunces-latin-500-normal.woff2?url";
import fraunces600 from "@fontsource/fraunces/files/fraunces-latin-600-normal.woff2?url";

const FONT_PRELOADS = [outfit400, outfit500, fraunces500, fraunces600].map((href) => ({
  rel: "preload",
  href,
  as: "font",
  type: "font/woff2",
  crossOrigin: "anonymous" as const,
}));

const APP_NAME = "Eugene Desk";

/** Language/level hint from the `eugene-desk-prefs` cookie (see prefs-cookie.ts). */
const readPrefsHint = createIsomorphicFn()
  .server((): PrefsHint => {
    // The HTML now depends on that cookie: keep shared caches from reusing one
    // visitor's page for another.
    setResponseHeader("Cache-Control", "private, no-cache");
    setResponseHeader("Vary", "Cookie");
    try {
      return parsePrefsValue(getCookie(PREFS_COOKIE));
    } catch {
      return { lang: null, level: null };
    }
  })
  .client((): PrefsHint => readPrefsCookie(document.cookie));

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
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg?v=2" },
      ...FONT_PRELOADS,
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/brand/apple-touch-icon.png" },
    ],
    scripts: [{ children: deskBootScript }],
  }),
  loader: async (): Promise<PrefsHint> => {
    const hint = readPrefsHint();
    // es/ko/vi/ja pages need their pack before the server renders them.
    if (hint.lang) await loadLangPack(hint.lang).catch(() => {});
    return hint;
  },
  // The hint only shapes the first render; client navigations need no reload.
  shouldReload: false,
  component: Root,
});

function Root() {
  const hint = Route.useLoaderData();
  const pageLang: Lang = hint.lang ?? DEFAULT_LANG;
  const packJson = inlinePackJson(pageLang);
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
    // Server HTML uses the cookie hint (else the default language); boot-script.ts
    // corrects it from localStorage before paint and the effect above keeps it in sync.
    <html lang={htmlLang(pageLang)} className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-paper text-ink">
        {packJson && (
          <script
            id={PACK_SCRIPT_ID}
            type="application/json"
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: packJson }}
          />
        )}
        <PreviewHostBridge />
        <AuthProvider>
          <DeskHintContext.Provider value={hint}>
            <Shell>
              <Outlet />
            </Shell>
          </DeskHintContext.Provider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
