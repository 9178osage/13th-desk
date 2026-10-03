import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Calculator, Compass, GraduationCap, LibraryBig, MapPin } from "lucide-react";
import { DistrictBar } from "@/components/district-bar";
import { Button, Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import { LEVELS, type Level } from "@/lib/levels";
import { ensureDeskHydrated, useDesk, useLang } from "@/lib/store";
import { LANGS, htmlLang, isLang, tr, type Lang } from "@/lib/text";

const NAV = [
  { to: "/", en: "Today", zh: "今日", icon: GraduationCap },
  { to: "/campus", en: "Campus", zh: "校园", icon: LibraryBig },
  { to: "/town", en: "Town", zh: "城里", icon: MapPin },
  { to: "/guide", en: "Guide", zh: "指南", icon: Compass },
  { to: "/gpa", en: "GPA", zh: "绩点", icon: Calculator },
] as const;

function navText(
  item: (typeof NAV)[number],
  level: Level,
  lang: Lang,
) {
  if (item.to === "/campus" && level !== "uni") {
    return tr(lang, { en: "Schools", zh: "学校" });
  }
  return tr(lang, item);
}

function SetupSheet() {
  const lang = useLang();
  const langSet = useDesk((s) => s.langSet);
  const levelSet = useDesk((s) => s.levelSet);
  const setSetup = useDesk((s) => s.setSetup);
  const hydrated = useDesk((s) => s.hydrated);
  const [pickLang, setPickLang] = useState<Lang>(lang);
  const [pickLevel, setPickLevel] = useState<Level | null>(null);

  if (!hydrated || (langSet && levelSet)) return null;

  function confirm() {
    if (!pickLevel) return;
    setSetup({ lang: pickLang, level: pickLevel });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/35 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-title"
    >
      <Card className="w-full max-w-md p-5 shadow-lift">
        <p className="text-xs uppercase tracking-widest text-muted">Eugene Desk</p>
        <h2 id="setup-title" className="mt-1 font-display text-3xl text-ink">
          {tr(pickLang, { en: "Welcome to Eugene Desk", zh: "欢迎使用 Eugene Desk" })}
        </h2>
        <p className="mt-2 text-sm text-muted">
          {tr(pickLang, {
            en: "Pick a language and school level. You can change both anytime in the header.",
            zh: "请选择语言和学段，之后可在页面顶部修改。",
          })}
        </p>

        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted">
          {tr(pickLang, { en: "Language", zh: "语言" })}
        </p>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {LANGS.map((item) => {
            const on = pickLang === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setPickLang(item.id);
                  setSetup({ lang: item.id });
                }}
                className={cn(
                  "min-h-10 rounded-md border px-2 text-sm",
                  on ? "border-moss bg-moss-soft text-ink" : "border-line bg-card text-muted",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted">
          {tr(pickLang, { en: "Level", zh: "学段" })}
        </p>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          {LEVELS.map((item) => {
            const on = pickLevel === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={on}
                onClick={() => setPickLevel(item.id)}
                className={cn(
                  "min-h-11 rounded-md border px-2 text-sm",
                  on ? "border-moss bg-moss text-card" : "border-line bg-card text-ink",
                )}
              >
                {tr(pickLang, { en: item.en, zh: item.zh })}
              </button>
            );
          })}
        </div>

        <Button className="mt-5 w-full" disabled={!pickLevel} onClick={confirm}>
          {tr(pickLang, { en: "Get started", zh: "开始使用" })}
        </Button>
      </Card>
    </div>
  );
}

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
          <Link
            to="/"
            className="brand-lockup"
            aria-label={tr(lang, { en: "Eugene Desk home", zh: "Eugene Desk首页" })}
          >
            <span className="brand-mark">
              <img
                src="/brand/eugene-desk-mark.svg"
                alt=""
                width={36}
                height={36}
                decoding="async"
              />
            </span>
            <span>
              <span className="brand-name">
                {tr(lang, { en: "Eugene Desk", zh: "Eugene Desk" })}
              </span>
              <span className="brand-subtitle">
                {tr(lang, { en: "Eugene student desk", zh: "Eugene Desk" })}
              </span>
            </span>
          </Link>
          <div className="header-actions">
            <span className="header-location">
              <MapPin size={14} aria-hidden="true" /> Eugene, OR
            </span>
            <label>
              <span className="sr-only">{tr(lang, { en: "Language", zh: "语言" })}</span>
              <select
                className="header-select"
                value={lang}
                onChange={(event) => {
                  const next = event.target.value;
                  if (!isLang(next)) return;
                  if (typeof document !== "undefined") {
                    document.documentElement.lang = htmlLang(next);
                  }
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

        <div className="shell-tools">
          <div className="shell-tools-inner">
            <div className="level-pills" role="group" aria-label={tr(lang, { en: "Level", zh: "学段" })}>
              {LEVELS.map((item) => {
                const on = level === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setLevel(item.id)}
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

        <nav className="primary-nav" aria-label="Primary">
          {NAV.map((item) => {
            const on = item.to === "/" ? path === "/" : path.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to} aria-current={on ? "page" : undefined}>
                {navText(item, level, lang)}
              </Link>
            );
          })}
        </nav>
      </header>

      <main id="content" className="shell-main">
        {children}
      </main>

      <nav className="mobile-tabbar pb-safe md:hidden" aria-label="Primary">
        <ul>
          {NAV.map((item) => {
            const on = item.to === "/" ? path === "/" : path.startsWith(item.to);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  aria-current={on ? "page" : undefined}
                  className={on ? "is-active" : undefined}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{navText(item, level, lang)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <SetupSheet />
    </>
  );
}
