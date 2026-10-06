/**
 * `eugene-desk-prefs`: a tiny first-party cookie that only mirrors two choices
 * — language and school level — so the server can render the right page on
 * first paint. It is a hint, never the source of truth: `13th-desk-v1` in
 * localStorage still owns every value, and the client rewrites (or clears) the
 * cookie from it after every load and every change. No personal data.
 *
 * Value format: `<lang>.<level>`, with `-` for "not chosen", e.g. `es.high`,
 * `ja.-`, `-.mid`. Keep this module alias-free: desk.test.ts imports it.
 */
export const PREFS_COOKIE = "eugene-desk-prefs";
export const PREFS_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const PREFS_LANGS = ["en", "zh", "es", "ko", "vi", "ja"] as const;
export const PREFS_LEVELS = ["elem", "mid", "high", "uni"] as const;
export type PrefsLang = (typeof PREFS_LANGS)[number];
export type PrefsLevel = (typeof PREFS_LEVELS)[number];
export type PrefsHint = { lang: PrefsLang | null; level: PrefsLevel | null };

export const EMPTY_PREFS: PrefsHint = { lang: null, level: null };

function asLang(value: unknown): PrefsLang | null {
  return (PREFS_LANGS as readonly unknown[]).includes(value) ? (value as PrefsLang) : null;
}

function asLevel(value: unknown): PrefsLevel | null {
  return (PREFS_LEVELS as readonly unknown[]).includes(value) ? (value as PrefsLevel) : null;
}

/** Cookie value for the explicit choices only; null means "clear the cookie". */
export function formatPrefsValue(state: {
  lang: string;
  langSet: boolean;
  level: string;
  levelSet: boolean;
}): string | null {
  const lang = state.langSet ? asLang(state.lang) : null;
  const level = state.levelSet ? asLevel(state.level) : null;
  if (!lang && !level) return null;
  return `${lang ?? "-"}.${level ?? "-"}`;
}

/** Parse a cookie value; anything unexpected becomes "not chosen". */
export function parsePrefsValue(value: string | null | undefined): PrefsHint {
  if (!value || value.length > 16) return EMPTY_PREFS;
  const decoded = decodeURIComponent(value);
  if (!/^[a-z-]+\.[a-z-]+$/.test(decoded)) return EMPTY_PREFS;
  const [lang, level] = decoded.split(".");
  return { lang: asLang(lang), level: asLevel(level) };
}

/** Pick `eugene-desk-prefs` out of a `Cookie` header / `document.cookie`. */
export function readPrefsCookie(cookieHeader: string | null | undefined): PrefsHint {
  if (!cookieHeader) return EMPTY_PREFS;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === PREFS_COOKIE) {
      try {
        return parsePrefsValue(part.slice(eq + 1).trim());
      } catch {
        return EMPTY_PREFS;
      }
    }
  }
  return EMPTY_PREFS;
}

/** String for `document.cookie = …` (null value clears the cookie). */
export function prefsCookieString(value: string | null, secure: boolean): string {
  const attrs = ["Path=/", "SameSite=Lax"];
  if (secure) attrs.push("Secure");
  return value === null
    ? `${PREFS_COOKIE}=; Max-Age=0; ${attrs.join("; ")}`
    : `${PREFS_COOKIE}=${value}; Max-Age=${PREFS_COOKIE_MAX_AGE}; ${attrs.join("; ")}`;
}
