/**
 * Channel entry paths (e.g. /card on a printed card, /isa in an email).
 * Each one renders the home page so Vercel Web Analytics records the path
 * itself as the source — Hobby plans do not report query/UTM params.
 * Nothing about the visitor is stored. Add a future channel with one line.
 */
export const CHANNELS = ["card", "isa", "teacher", "eld"] as const;

export type Channel = (typeof CHANNELS)[number];

export function isChannel(slug: string | undefined | null): slug is Channel {
  return typeof slug === "string" && (CHANNELS as readonly string[]).includes(slug);
}

/** "/card" → "/" for nav highlighting; any other path is returned as-is. */
export function homeAliasPath(path: string): string {
  return isChannel(path.replace(/^\//, "").replace(/\/$/, "")) ? "/" : path;
}
