import { readPrefsCookie } from "./prefs-cookie.ts";
import type { Lang } from "./text.ts";

export type { Lang };

export const ERROR_TITLE: Record<Lang, string> = {
  en: "Something went wrong",
  zh: "出了点问题",
  es: "Algo salió mal",
  ko: "문제가 생겼어요",
  vi: "Đã có lỗi",
  ja: "問題が起きました",
};

export const ERROR_FALLBACK: Record<Lang, string> = {
  en: "An unexpected error occurred. Try reloading the page.",
  zh: "出现了意外错误。请重新加载页面。",
  es: "Ocurrió un error inesperado. Prueba a recargar la página.",
  ko: "예상하지 못한 오류가 났어요. 페이지를 다시 불러 보세요.",
  vi: "Đã xảy ra lỗi không mong muốn. Hãy tải lại trang.",
  ja: "予期しないエラーが起きました。ページを読み込み直してください。",
};

function langFromHtml(value: string): Lang | null {
  const lang = value.toLowerCase();
  if (lang.startsWith("zh")) return "zh";
  if (lang.startsWith("es")) return "es";
  if (lang.startsWith("ko")) return "ko";
  if (lang.startsWith("vi")) return "vi";
  if (lang.startsWith("ja")) return "ja";
  if (lang.startsWith("en")) return "en";
  return null;
}

/** Language already chosen for this page, without depending on the store. */
export function errorPageLang(): Lang {
  if (typeof document === "undefined") return "en";
  const fromHtml = langFromHtml(document.documentElement.lang);
  if (fromHtml) return fromHtml;
  const fromCookie = readPrefsCookie(document.cookie).lang;
  if (fromCookie) return fromCookie;
  return "en";
}
