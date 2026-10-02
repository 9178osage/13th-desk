import { useEffect } from "react";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { Shell } from "@/components/shell";
import { htmlLang, type Lang } from "@/lib/text";
import { useDesk } from "@/lib/store";
import appCss from "../styles.css?url";

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
          "Eugene Desk — Eugene student desk: today tasks, schedule, places, GPA, and campus shortcuts.",
      },
      { name: "theme-color", content: "#f1ebe3" },
      { name: "referrer", content: "strict-origin-when-cross-origin" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/brand/apple-touch-icon.png" },
    ],
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
    <html lang="en" className="antialiased" suppressHydrationWarning>
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
