/**
 * URL extraction for scripts/check-links.mjs.
 *
 * Query strings legitimately hold commas (Open-Meteo lists fields as
 * `current=temperature_2m,weather_code`), so a comma never ends a URL here. A URL ends
 * at whitespace, a quote or backtick, or `<`/`>`; afterwards trailing sentence
 * punctuation is trimmed, and a closing bracket only when it has no partner inside the
 * URL (so "(see https://x.org/a)" loses the ")" but "https://x.org/a_(b)" keeps it).
 */
const CANDIDATE = /https?:\/\/[^\s"'`<>\\]+/g;
const PAIRS = { ")": "(", "]": "[", "}": "{" };

function count(text, char) {
  let n = 0;
  for (const c of text) if (c === char) n++;
  return n;
}

export function trimUrl(raw) {
  let url = raw;
  for (;;) {
    const last = url.at(-1);
    if (last && ".,;:!?".includes(last)) {
      url = url.slice(0, -1);
    } else if (last && PAIRS[last] && count(url, last) > count(url, PAIRS[last])) {
      url = url.slice(0, -1);
    } else {
      return url;
    }
  }
}

export function extractUrls(text) {
  return [...String(text).matchAll(CANDIDATE)].map((match) => trimUrl(match[0]));
}
