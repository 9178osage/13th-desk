import { useEffect, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Calculator, Compass, GraduationCap, LibraryBig, MapPin } from "lucide-react";
import { LEVELS } from "@/lib/levels";
import { ensureDeskHydrated, useDesk, useLang } from "@/lib/store";
import { htmlLang, isLang, LANGS, tr } from "@/lib/text";

const NAV = [
  { to: "/", en: "Today", zh: "今日", icon: GraduationCap },
  { to: "/campus", en: "Campus", zh: "校园", icon: LibraryBig },
  { to: "/town", en: "Town", zh: "城里", icon: MapPin },
  { to: "/guide", en: "Guide", zh: "指南", icon: Compass },
  { to: "/gpa", en: "GPA", zh: "绩点", icon: Calculator },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const lang = useLang();
  const setLang = useDesk((state) => state.setLang);
  const level = useDesk((state) => state.level);
  const setLevel = useDesk((state) => state.setLevel);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const path = pathname.replace(/\/$/, "") || "/";

  useEffect(() => {
    void ensureDeskHydrated();
  }, []);

  return (
    <>
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2"
      >
        {tr(lang, { en: "Skip to content", zh: "跳到正文" })}
      </a>
      <header className="site-header pt-safe">
        <div className="site-header-inner">
          <Link to="/" className="brand-lockup" aria-label={tr(lang, { en: "Valley Campus Dashboard home", zh: "河谷校园仪表盘首页" })}>
            <span className="brand-mark">
              <GraduationCap size={20} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <span>
              <span className="brand-name">{tr(lang, { en: "Valley Campus", zh: "河谷校园仪表盘" })}</span>
              <span className="brand-subtitle">
                {tr(lang, { en: "Eugene student portal", zh: "尤金学生门户" })}
              </span>
            </span>
          </Link>
          <div className="header-actions">
            <span className="header-location">
              <MapPin size={14} aria-hidden="true" /> Eugene, OR
            </span>
            <label>
              <span className="sr-only">{tr(lang, { en: "School level", zh: "学段" })}</span>
              <select
                className="header-select"
                value={level}
                onChange={(event) => setLevel(event.target.value as typeof level)}
              >
                {LEVELS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {tr(lang, { en: item.en, zh: item.zh })}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">{tr(lang, { en: "Language", zh: "语言" })}</span>
              <select
                className="header-select"
                value={lang}
                onChange={(event) => {
                  const next = event.target.value;
                  if (!isLang(next)) return;
                  if (typeof document !== "undefined") document.documentElement.lang = htmlLang(next);
                  setLang(next);
                }}
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
        <nav className="primary-nav" aria-label="Primary">
          {NAV.map((item) => {
            const on = item.to === "/" ? path === "/" : path.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to} aria-current={on ? "page" : undefined}>
                {tr(lang, item)}
              </Link>
            );
          })}
        </nav>
      </header>
      <main id="content" className="min-h-screen pb-24 md:pb-0">
        {children}
      </main>
      <nav className="mobile-tabbar pb-safe md:hidden" aria-label="Primary">
        <ul>
          {NAV.map((item) => {
            const on = item.to === "/" ? path === "/" : path.startsWith(item.to);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link to={item.to} aria-current={on ? "page" : undefined} className={on ? "is-active" : undefined}>
                  <Icon size={18} aria-hidden="true" />
                  <span>{tr(lang, item)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
