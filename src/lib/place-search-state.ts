import type { PlaceCat } from "../data/places.ts";

export type PlaceFilter = "all" | "saved" | PlaceCat;
export type PlaceSearch = { q?: string; cat?: PlaceFilter };

export function validatePlaceSearch(
  search: Record<string, unknown>,
  page: "campus" | "town",
): PlaceSearch {
  const allowed =
    page === "campus" ? ["study", "dining", "saved"] : ["coffee", "eat", "out", "errand", "saved"];
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
