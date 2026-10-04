import { useEffect, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  Calculator,
  Compass,
  House,
  LibraryBig,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { DistrictBar } from "@/components/district-bar";
import { LEVELS, isLevel } from "@/lib/levels";
import { ensureDeskHydrated, useDesk, useLang, useStorageStatus } from "@/lib/store";
import { LANGS, isLang, tr } from "@/lib/text";
import { deskText as c, type DeskCopyKey } from "@/lib/desk-copy";

const NAV = [
  { to: "/", key: "today", short: "today", icon: House },
  { to: "/campus", key: "campus", short: "campus", icon: LibraryBig },
  { to: "/town", key: "town", short: "townShort", icon: MapPin },
  { to: "/guide", key: "guide", short: "guideShort", icon: Compass },
  { to: "/gpa", key: "gpa", short: "gpaShort", icon: Calculator },
] as const satisfies readonly {
  to: string;
  key: DeskCopyKey;
  short: DeskCopyKey;
  icon: typeof House;
}[];

export function Shell({ children }: { children: ReactNode }) {
  const lang = useLang();
  const level = useDesk((s) => s.level);
  const setLang = useDesk((s) => s.setLang);
  const setLevel = useDesk((s) => s.setLevel);
  const failed = useStorageStatus((s) => s.failed);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const path = pathname.replace(/\/$/, "") || "/";
  const current = NAV.find((item) => item.to === path) ?? NAV[0];
  const label = (key: DeskCopyKey) =>
    c(lang, key === "campus" && level !== "uni" ? "schools" : key);

  useEffect(() => {
    void ensureDeskHydrated();
  }, []);

  const brand = (
    <Link to="/" className="desk-brand" aria-label="Eugene Desk">
      <img src="/brand/eugene-desk-mark.svg" alt="" width={40} height={40} />
      <span>
        <strong>
          Eugene Desk<span className="brand-dot">.</span>
        </strong>
        <small>EUGENE, OREGON</small>
      </span>
    </Link>
  );

  return (
    <div className="desk-shell">
      <a href="#content" className="skip-link">
        {tr(lang, { en: "Skip to content", zh: "跳到正文" })}
      </a>
      <aside className="desk-sidebar">
        {brand}
        <p className="rail-caption">{c(lang, "workspace")}</p>
        <nav className="desk-nav" aria-label={c(lang, "workspace")}>
          {NAV.map(({ to, key, icon: Icon }) => (
            <Link key={to} to={to} aria-current={path === to ? "page" : undefined}>
              <Icon size={20} aria-hidden="true" />
              <span>{label(key)}</span>
            </Link>
          ))}
        </nav>
        <div className="rail-note">
          <BookOpen size={23} strokeWidth={1.5} aria-hidden="true" />
          <p>{c(lang, "privacy")}</p>
          <span className="local-status">
            <ShieldCheck size={15} aria-hidden="true" />
            {c(lang, "local")}
          </span>
        </div>
        <div className="rail-footer">
          EUGENE DESK <span>EST. 2026</span>
        </div>
      </aside>
      <div className="desk-workspace">
        <header className="desk-topbar">
          <div className="mobile-brand">{brand}</div>
          <span className="desktop-crumb">
            Eugene Desk <span>/</span> <strong>{label(current.key)}</strong>
          </span>
          <div className="desk-preferences">
            <label>
              <span>{c(lang, "level")}</span>
              <select
                value={level}
                onChange={(e) => {
                  if (isLevel(e.target.value)) setLevel(e.target.value);
                }}
              >
                {LEVELS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {tr(lang, item)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">{c(lang, "language")}</span>
              <select
                value={lang}
                onChange={(e) => {
                  if (isLang(e.target.value)) setLang(e.target.value);
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
        </header>
        {level !== "uni" && (
          <div className="district-toolbar">
            <DistrictBar compact />
          </div>
        )}
        {failed && (
          <div className="storage-alert" role="alert">
            {c(lang, "storageError")}
          </div>
        )}
        <main id="content" className="shell-main" tabIndex={-1}>
          {children}
        </main>
        <footer className="desk-footer">
          <span>Eugene Desk</span>
          <span>{c(lang, "local")} · Eugene, OR</span>
        </footer>
      </div>
      <nav className="desk-mobile-nav" aria-label={c(lang, "workspace")}>
        {NAV.map(({ to, short, icon: Icon }) => (
          <Link key={to} to={to} aria-current={path === to ? "page" : undefined}>
            <Icon size={20} aria-hidden="true" />
            <span>{label(short)}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
