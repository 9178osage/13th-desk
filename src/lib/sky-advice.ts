// Relative + `.ts` imports: loaded by the node test runner (desk.test.ts).
import type { Level } from "./levels.ts";
import type { Copy } from "./text.ts";

export type Kind = "clear" | "cloud" | "fog" | "rain" | "snow" | "storm";

/**
 * One local line under the temperature. English is the lookup key for the
 * es/ko/vi/ja packs (src/lib/i18n/*.json), which already carry these lines.
 */
export function skyAdvice(kind: Kind, level: Level): Copy | null {
  const uni = level === "uni";
  if (kind === "clear") {
    return uni
      ? { en: "If this holds, the quad is actually usable.", zh: "天气要是保持这样，今天草坪真能坐人。" }
      : { en: "If this holds, outside is fine after school.", zh: "天气要是保持这样，放学后适合在外面待会儿。" };
  }
  if (kind === "rain" || kind === "storm") {
    return uni
      ? { en: "Jacket. Knight over the quad.", zh: "带件外套。别去草坪了，去 Knight 吧。" }
      : { en: "Grab a jacket. Don't stand in the rain.", zh: "带件外套，别在雨里站着。" };
  }
  if (kind === "fog") {
    return { en: "Fog sits on the river. Give the bike path a minute.", zh: "河面有雾，骑河边车道慢一点。" };
  }
  if (kind === "snow") {
    return {
      en: "Unusual for the valley floor. Check the bus before you trust a bike.",
      zh: "河谷很少下雪，骑车前先看公交开不开。",
    };
  }
  return null;
}

