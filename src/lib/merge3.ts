/**
 * Three-way merge of two saved desks that both started from `base`.
 * Used when another tab saved while this tab had an edit in flight, so neither
 * tab's save is lost:
 *  - a value only one side changed takes that side's change;
 *  - plain objects merge key by key;
 *  - arrays merge as sets keyed by `id` (objects) or by value (strings, numbers):
 *    items either side added are kept, items either side removed from `base`
 *    are dropped, items both sides kept are merged recursively;
 *  - a scalar both sides changed differently goes to `ours` (this tab's latest edit).
 */
export function merge3(base: unknown, ours: unknown, theirs: unknown): unknown {
  if (same(ours, theirs)) return ours;
  if (same(ours, base)) return theirs;
  if (same(theirs, base)) return ours;
  if (Array.isArray(ours) && Array.isArray(theirs)) {
    return mergeArrays(Array.isArray(base) ? base : [], ours, theirs);
  }
  if (isObject(ours) && isObject(theirs)) {
    const b = isObject(base) ? base : {};
    const entries: [string, unknown][] = [];
    for (const key of new Set([...Object.keys(theirs), ...Object.keys(ours)])) {
      const inOurs = Object.hasOwn(ours, key);
      const inTheirs = Object.hasOwn(theirs, key);
      const inBase = Object.hasOwn(b, key);
      if (inOurs && inTheirs)
        entries.push([key, merge3(inBase ? b[key] : undefined, ours[key], theirs[key])]);
      else if (inOurs) {
        if (!inBase || !same(b[key], ours[key])) entries.push([key, ours[key]]);
      } else if (!inBase || !same(b[key], theirs[key])) entries.push([key, theirs[key]]);
    }
    // Unlike out[key] assignment, fromEntries keeps "__proto__" as an ordinary own key.
    return Object.fromEntries(entries);
  }
  return ours;
}

function mergeArrays(base: unknown[], ours: unknown[], theirs: unknown[]): unknown[] {
  const index = (list: unknown[]) => {
    const map = new Map<string, unknown>();
    for (const item of list) map.set(keyOf(item), item);
    return map;
  };
  const b = index(base);
  const o = index(ours);
  const t = index(theirs);
  const out: unknown[] = [];
  const seen = new Set<string>();
  // Their order first (already on disk), then what only this tab added.
  for (const key of [...t.keys(), ...o.keys()]) {
    if (seen.has(key)) continue;
    seen.add(key);
    const inBase = b.has(key);
    const inOurs = o.has(key);
    const inTheirs = t.has(key);
    if (inOurs && inTheirs) out.push(merge3(b.get(key), o.get(key), t.get(key)));
    else if (!inBase) out.push(inOurs ? o.get(key) : t.get(key)); // added on one side
    // in base but missing on one side: that side deleted it
  }
  return out;
}

function keyOf(item: unknown): string {
  if (isObject(item) && typeof item.id === "string") return `id:${item.id}`;
  return `v:${JSON.stringify(item)}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
