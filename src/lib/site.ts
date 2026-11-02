/** Public production origin: canonical links, sitemap and robots.txt point here. */
export const SITE_ORIGIN = "https://eugene-desk.vercel.app";

/** Indexable pages. Channel entry paths (/card, /isa, …) canonicalize to "/". */
export const SITE_PAGES = ["/", "/guide", "/campus", "/town", "/gpa"] as const;

export function canonicalLink(path: string) {
  return { rel: "canonical", href: `${SITE_ORIGIN}${path}` };
}
