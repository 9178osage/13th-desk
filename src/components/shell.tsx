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
      <header className="sticky top-0 z-30 border-b border-ink/80 bg-paper/95 backdrop-blur-md pt-safe">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5">
          <Link to="/" className="min-w-0">
            <span className="block font-display text-xl leading-none tracking-tight text-ink md:text-2xl">
              13th Desk
            </span>
            <span className="mt-0.5 hidden text-[10px] uppercase tracking-[0.16em] text-muted sm:block">
              {tr(lang, { en: "Eugene student web", zh: "尤金学生网" })}
            </span>
          </Link>
          <label className="shrink-0">
            <span className="sr-only">{tr(lang, { en: "Language", zh: "语言" })}</span>
            <select
              value={lang}
              onChange={(event) => {
                const next = event.target.value;
                if (isLang(next)) setLang(next);
              }}
              className="min-h-9 max-w-[8.5rem] rounded-full border border-line bg-card px-2.5 text-xs text-ink shadow-sm md:min-h-10 md:text-sm"
            >
              {LANGS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="border-t border-line/80 bg-paper-deep/40">
          <div className="mx-auto flex max-w-5xl flex-col gap-1.5 px-3 py-1.5 sm:flex-row sm:items-center sm:gap-3">
            <div
              className="grid min-w-0 flex-1 grid-cols-4 gap-0.5 rounded-md bg-card/70 p-0.5 shadow-sm"
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
                      "min-h-9 rounded-[0.4rem] px-1 text-[11px] whitespace-nowrap md:min-h-10 md:px-2 md:text-sm",
                      on ? "bg-moss text-card shadow-sm" : "text-muted hover:text-ink",
                    )}
                  >
                    <span className="md:hidden">{lang === "zh" ? item.zh : item.shortEn}</span>
                    <span className="hidden md:inline">{tr(lang, { en: item.en, zh: item.zh })}</span>
                  </button>
                );
              })}
            </div>
            <DistrictBar compact />
          </div>
        </div>

        <nav className="mx-auto hidden max-w-5xl gap-5 px-4 md:flex" aria-label="Primary">
          {NAV.map((item) => {
            const on = item.to === "/" ? path === "/" : path.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-10 items-center border-b-2 text-sm",
                  on ? "border-moss font-medium text-ink" : "border-transparent text-muted hover:text-ink",
                )}
              >
                {navText(item, level, lang)}
              </Link>
            );
          })}
        </nav>
      </header>

      <main id="content" className="mx-auto min-h-screen max-w-5xl px-4 pb-28 pt-5 md:pb-16 md:pt-6">
        {children}
      </main>

      <nav
        className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 shadow-[0_-8px_24px_-16px_rgba(20,33,27,0.25)] backdrop-blur-md md:hidden"
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
                  className={cn(
                    "relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 text-[11px] leading-tight",
                    on && "text-ink",
                  )}
                >
                  {on ? (
                    <span
                      className="absolute top-1 h-1 w-6 rounded-full bg-moss"
                      aria-hidden
                    />
                  ) : null}
                  <span
                    className={cn(
                      "grid size-8 place-items-center rounded-full",
                      on && "bg-moss-soft",
                    )}
                  >
                    <Icon className={on ? "size-5 text-moss" : "size-5 text-muted"} aria-hidden />
                  </span>
                  <span className={cn("max-w-full truncate", on ? "font-semibold text-ink" : "text-muted")}>
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
