import { useEffect, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Calculator, Compass, Library, MapPin, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { DistrictBar } from "@/components/district-bar";
import { LEVELS } from "@/lib/levels";
import { useDesk, useLang } from "@/lib/store";
import { LANGS, isLang, tr } from "@/lib/text";

const NAV = [
  { to: "/", en: "Today", zh: "今日", icon: Sun },
  { to: "/campus", en: "Campus", zh: "校园", icon: Library },
  { to: "/town", en: "Town", zh: "城里", icon: MapPin },
  { to: "/guide", en: "Guide", zh: "指南", icon: Compass },
  { to: "/gpa", en: "GPA", zh: "绩点", icon: Calculator },
] as const;

function navText(
  item: (typeof NAV)[number],
  level: ReturnType<typeof useDesk.getState>["level"],
  lang: ReturnType<typeof useLang>,
) {
  if (item.to === "/campus" && level !== "uni") return tr(lang, { en: "Schools", zh: "学校" });
  return tr(lang, item);
}

export function Shell({ children }: { children: ReactNode }) {
  const lang = useLang();
  const setLang = useDesk((state) => state.setLang);
  const level = useDesk((state) => state.level);
  const setLevel = useDesk((state) => state.setLevel);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const path = pathname.replace(/\/$/, "") || "/";

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        if (!useDesk.persist.hasHydrated()) {
          await useDesk.persist.rehydrate();
        }
      } catch {
        /* broken storage should not blank the desk */
      }
      if (live) useDesk.setState({ hydrated: true });
    })();
    return () => {
      live = false;
    };
  }, []);

  return (
    <>
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2"
      >
        {tr(lang, { en: "Skip to content", zh: "跳到正文" })}
      </a>
      <header className="sticky top-0 z-30 border-b-2 border-ink bg-paper">
        <div className="border-b border-ink">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
            <Link to="/" className="min-w-0">
              <span className="block font-display text-3xl leading-none tracking-tight text-ink">
                13th Desk
              </span>
              <span className="mt-1 block text-xs uppercase tracking-widest text-muted">
                {tr(lang, { en: "Eugene student web", zh: "尤金学生网" })}
              </span>
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              <label className="shrink-0">
              <span className="sr-only">{tr(lang, { en: "Language", zh: "语言" })}</span>
              <select
                value={lang}
                onChange={(event) => {
                  const next = event.target.value;
                  if (isLang(next)) setLang(next);
                }}
                className="min-h-11 max-w-[9.5rem] rounded-full border border-line bg-card px-3 text-sm text-ink"
              >
                {LANGS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              </label>
            </div>
          </div>
        </div>
        <div
          className="mx-auto grid max-w-5xl grid-cols-4 gap-1 px-3 py-2"
          role="group"
          aria-label={tr(lang, { en: "Level", zh: "学段" })}
        >
          {LEVELS.map((item) => {
            const on = level === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={on}
                onClick={() => setLevel(item.id)}
                className={cn(
                  "min-h-11 rounded-md px-2 text-sm",
                  on ? "bg-moss text-card" : "text-muted hover:text-ink",
                )}
              >
                {tr(lang, { en: item.en, zh: item.zh })}
              </button>
            );
          })}
        </div>
        <DistrictBar />
        <nav className="mx-auto hidden max-w-5xl gap-6 px-4 md:flex" aria-label="Primary">
          {NAV.map((item) => {
            const on = item.to === "/" ? path === "/" : path.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center border-b-2 text-sm",
                  on ? "border-moss text-ink" : "border-transparent text-muted hover:text-ink",
                )}
              >
                {navText(item, level, lang)}
              </Link>
            );
          })}
        </nav>
      </header>
      <main id="content" className="mx-auto min-h-screen max-w-5xl px-4 pb-28 pt-6 md:pb-16">
        {children}
      </main>
      <nav
        className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card md:hidden"
        aria-label="Primary"
      >
        <ul className="grid grid-cols-5">
          {NAV.map((item) => {
            const on = item.to === "/" ? path === "/" : path.startsWith(item.to);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  aria-current={on ? "page" : undefined}
                  className="flex min-h-14 flex-col items-center justify-center gap-1 text-xs"
                >
                  <Icon className={on ? "size-5 text-moss" : "size-5 text-muted"} aria-hidden />
                  <span className={on ? "font-medium text-ink" : "text-muted"}>
                    {navText(item, level, lang)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
