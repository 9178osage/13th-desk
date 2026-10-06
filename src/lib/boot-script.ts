/**
 * Tiny inline script that runs in <head> before first paint (see __root.tsx).
 *
 * The desk is server-rendered with defaults (English, first visit). For a
 * returning visitor it reads `13th-desk-v1` once and
 *  - sets `<html lang>` to the saved language right away, and
 *  - marks `<html data-desk-setup="done">` so CSS can hide the first-visit
 *    setup note before React hydrates (no layout jump for either group).
 *  - on Android / Linux / ChromeOS marks `<html data-desk-fonts="lean">` so
 *    the font stacks skip "PingFang SC", "Hiragino Sans" and "Malgun Gothic".
 *    Those fonts only ship with Apple and Windows systems; elsewhere every
 *    missing name costs a system font lookup during the first layout, while
 *    the text ends up in the same fallback font either way.
 * It only reads storage; it never writes, and any error leaves the defaults.
 * Keep it alias-free: desk.test.ts evaluates it under node.
 */
export const BOOT_HTML_LANG: Record<string, string> = {
  en: "en",
  zh: "zh-CN",
  es: "es",
  ko: "ko",
  vi: "vi",
  ja: "ja",
};

export const BOOT_LEVELS = ["elem", "mid", "high", "uni"];

function boot(key: string, langs: Record<string, string>, levels: string[]) {
  try {
    const ua = String((typeof navigator !== "undefined" && navigator.userAgent) || "");
    if (/Android|Linux|CrOS/.test(ua) && !/iPhone|iPad|iPod|Macintosh|Windows/.test(ua)) {
      document.documentElement.setAttribute("data-desk-fonts", "lean");
    }
  } catch {
    /* keep the full font stacks */
  }
  try {
    const raw = localStorage.getItem(key);
    const state = raw ? JSON.parse(raw).state : null;
    if (!state || typeof state !== "object") return;
    const root = document.documentElement;
    const langSet =
      state.langSet === true && Object.prototype.hasOwnProperty.call(langs, state.lang);
    if (langSet) root.lang = langs[state.lang];
    const levelSet = state.levelSet === true || levels.indexOf(state.level) !== -1;
    if (langSet && levelSet) root.setAttribute("data-desk-setup", "done");
  } catch {
    /* keep server defaults */
  }
}

export const deskBootScript = `(${boot.toString()})(${JSON.stringify("13th-desk-v1")},${JSON.stringify(BOOT_HTML_LANG)},${JSON.stringify(BOOT_LEVELS)});`;
