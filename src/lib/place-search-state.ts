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

/** Every category a page can show for any level (level-independent). */
export function knownPlaceCategories(page: "campus" | "town"): Exclude<PlaceFilter, "all">[] {
  return placeCategories(page, "uni");
}

/**
 * Route-level parse: a static whitelist only. The route parses `?cat=` before the saved
 * level is known (on the server the store is shared and holds the default level), so the
 * level-specific check happens in the page via `effectivePlaceCategory` and
 * `usePlaceCategoryGuard`.
 */
export function parsePlaceSearch(search: Record<string, unknown>, page: "campus" | "town"): PlaceSearch {
  const known: string[] = knownPlaceCategories(page);
  return {
    ...(typeof search.q === "string" && search.q.trim() ? { q: search.q.slice(0, 80) } : {}),
    ...(typeof search.cat === "string" && known.includes(search.cat) ? { cat: search.cat as PlaceFilter } : {}),
  };
}

/** The category actually applied: never one the current level does not show. */
export function effectivePlaceCategory(
  cat: PlaceFilter | undefined,
  page: "campus" | "town",
  level: Level,
): PlaceFilter | undefined {
  if (!cat || cat === "all") return undefined;
  return (placeCategories(page, level) as PlaceFilter[]).includes(cat) ? cat : undefined;
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
