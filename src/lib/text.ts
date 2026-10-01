import es from "@/lib/i18n/es.json";
import ja from "@/lib/i18n/ja.json";
import ko from "@/lib/i18n/ko.json";
import vi from "@/lib/i18n/vi.json";

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

const packs: Record<Exclude<Lang, "en" | "zh">, Record<string, string>> = { es, ko, vi, ja };

export function isLang(value: unknown): value is Lang {
  return LANGS.some((item) => item.id === value);
}

export function htmlLang(lang: Lang): string {
  return LANGS.find((item) => item.id === lang)?.html ?? "en";
}

export function tr(lang: Lang, copy: Copy): string {
  const direct = copy[lang];
  if (direct) return direct;
  if (lang !== "en" && lang !== "zh") {
    const hit = packs[lang][copy.en];
    if (hit) return hit;
  }
  return copy.en;
}

export function tf(lang: Lang, copy: Copy, vars: Record<string, string | number>): string {
  return tr(lang, copy).replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}
