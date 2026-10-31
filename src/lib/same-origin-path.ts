/**
 * Path for a navigation this page starts itself (sign-in return, sign-out).
 * Other sites, `javascript:` URLs, and protocol-relative URLs are rejected.
 * Returns `pathname + search + hash`, or null.
 */
export function sameOriginAppPath(value: string, origin: string): string | null {
  if (!value.trim() || !origin) return null;
  let base: URL;
  let dest: URL;
  try {
    base = new URL(origin);
    dest = new URL(value, base);
  } catch {
    return null;
  }
  if (dest.origin !== base.origin) return null;
  if (dest.username || dest.password) return null;
  if (dest.protocol !== "https:" && dest.protocol !== "http:") return null;
  return `${dest.pathname}${dest.search}${dest.hash}`;
}
