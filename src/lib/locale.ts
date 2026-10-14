import type { Lang } from "./text.ts";

/**
 * One BCP-47 tag per desk language, used for every `Intl` call and for `<html lang>`.
 *
 * Bare `zh` and `en` are open to the runtime's own resolution (and to browser/Node
 * ICU differences), so both are pinned here. Everything that formats dates,
 * weekdays or numbers goes through this map — `time.ts`, `desk-copy.ts`,
 * `boot-script.ts` and the components all read the same table.
 *
 * Keep the import relative with a `.ts` extension: `boot-script.ts` pulls this
 * module into the node test graph, where the `@/` alias does not resolve.
 */
export const LOCALE: Record<Lang, string> = {
  en: "en-US",
  zh: "zh-CN",
  es: "es",
  ko: "ko",
  vi: "vi",
  ja: "ja",
};
