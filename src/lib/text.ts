export type Lang = "en" | "zh" | "es" | "ko" | "vi" | "ja";

export type Copy = {
  en: string;
  zh?: string;
  es?: string;
  ko?: string;
  vi?: string;
  ja?: string;
};

export const LANGS: { id: Lang; label: string; html: string }[] = [
  { id: "en", label: "English", html: "en" },
  { id: "zh", label: "中文", html: "zh-CN" },
  { id: "es", label: "Español", html: "es" },
  { id: "ko", label: "한국어", html: "ko" },
  { id: "vi", label: "Tiếng Việt", html: "vi" },
  { id: "ja", label: "日本語", html: "ja" },
];

type Pack = Record<string, string>;
type PackLang = Exclude<Lang, "en" | "zh">;

/**
 * es/ko/vi/ja content packs are code-split: only the pack for the language in
 * use is downloaded (English and Chinese need none). `tr` falls back to English
 * until a pack arrives; `useLang` (store.ts) keeps showing the previous
 * language until then, so a switch never renders half-translated.
 */
const packLoaders: Record<PackLang, () => Promise<{ default: Pack }>> = {
  es: () => import("./i18n/es.json"),
  ko: () => import("./i18n/ko.json"),
  vi: () => import("./i18n/vi.json"),
  ja: () => import("./i18n/ja.json"),
};
const packs: Partial<Record<PackLang, Pack>> = {};
const inflight: Partial<Record<PackLang, Promise<void>>> = {};
const packListeners = new Set<() => void>();
let packVersion = 0;

function needsPack(lang: Lang): lang is PackLang {
  return lang !== "en" && lang !== "zh";
}

/** id of the JSON <script> the server inlines for a cookie-hinted es/ko/vi/ja page. */
export const PACK_SCRIPT_ID = "eugene-desk-pack";

function registerPack(lang: PackLang, pack: Pack) {
  if (packs[lang]) return;
  packs[lang] = pack;
  packVersion += 1;
  for (const listener of packListeners) listener();
}

/**
 * JSON for the inline pack script, or null when the language needs none / is
 * not loaded. Same string on server and client, so hydration matches.
 */
export function inlinePackJson(lang: Lang): string | null {
  if (!needsPack(lang) || !packs[lang]) return null;
  return JSON.stringify({ lang, pack: packs[lang] }).replace(/</g, "\\u003c");
}

// Server-rendered pages in es/ko/vi/ja ship their pack inline: register it
// before React hydrates so the first client render matches the server HTML.
if (typeof document !== "undefined") {
  try {
    const el = document.getElementById(PACK_SCRIPT_ID);
    const data = el?.textContent
      ? (JSON.parse(el.textContent) as { lang?: unknown; pack?: unknown })
      : null;
    if (
      data &&
      typeof data.lang === "string" &&
      data.lang in packLoaders &&
      data.pack &&
      typeof data.pack === "object"
    ) {
      registerPack(data.lang as PackLang, data.pack as Pack);
    }
  } catch {
    /* fall back to loading the pack on demand */
  }
}

/** True when `tr(lang, …)` can already return fully translated text. */
export function isLangReady(lang: Lang): boolean {
  return !needsPack(lang) || packs[lang] !== undefined;
}

/** Download the content pack for `lang` (no-op for en/zh or when cached). */
export function loadLangPack(lang: Lang): Promise<void> {
  if (!needsPack(lang) || packs[lang]) return Promise.resolve();
  const existing = inflight[lang];
  if (existing) return existing;
  const job = packLoaders[lang]()
    .then((mod) => registerPack(lang, mod.default))
    .finally(() => {
      delete inflight[lang];
    });
  inflight[lang] = job;
  return job;
}

export function subscribeLangPacks(listener: () => void): () => void {
  packListeners.add(listener);
  return () => {
    packListeners.delete(listener);
  };
}

export function langPackVersion(): number {
  return packVersion;
}

export function isLang(value: unknown): value is Lang {
  return LANGS.some((item) => item.id === value);
}

export function htmlLang(lang: Lang): string {
  return LANGS.find((item) => item.id === lang)?.html ?? "en";
}

export function tr(lang: Lang, copy: Copy): string {
  const direct = copy[lang];
  if (direct) return direct;
  if (needsPack(lang)) {
    const hit = packs[lang]?.[copy.en];
    if (hit) return hit;
  }
  return copy.en;
}

export function tf(lang: Lang, copy: Copy, vars: Record<string, string | number>): string {
  return tr(lang, copy).replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}
