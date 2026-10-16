import type { PlaceCat } from "../data/places.ts";
import type { Level } from "./levels.ts";

export type PlaceFilter = "all" | "saved" | PlaceCat;
export type PlaceSearch = { q?: string; cat?: PlaceFilter };

/**
 * The category chips a page really shows for a level, in display order (without
 * "all"). Town has no coffee chip for elementary / middle school. This is the single
 * source for both the chips and the `?cat=` whitelist, so the URL can never hold a
 * category the visitor cannot see.
 */
export function placeCategories(page: "campus" | "town", level: Level): Exclude<PlaceFilter, "all">[] {
  if (page === "campus") return ["study", "dining", "saved"];
  return level === "elem" || level === "mid"
    ? ["eat", "out", "errand", "saved"]
    : ["coffee", "eat", "out", "errand", "saved"];
}

export function validatePlaceSearch(
  search: Record<string, unknown>,
  page: "campus" | "town",
  level: Level,
): PlaceSearch {
  const allowed: string[] = placeCategories(page, level);
  return {
    ...(typeof search.q === "string" && search.q.trim() ? { q: search.q.slice(0, 80) } : {}),
    ...(typeof search.cat === "string" && allowed.includes(search.cat)
      ? { cat: search.cat as PlaceFilter }
      : {}),
  };
}

export function placeSearchWithQuery(current: PlaceSearch, query: string): PlaceSearch {
  return { ...current, q: query || undefined };
}

export function placeSearchWithCategory(current: PlaceSearch, category: PlaceFilter): PlaceSearch {
  return { ...current, cat: category === "all" ? undefined : category };
}

/** An explicit place pick starts a fresh search, without a stale category. */
export function placeSelectionSearch(name: string): PlaceSearch {
  return { q: name };
}
