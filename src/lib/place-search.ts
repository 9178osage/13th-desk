import { useNavigate } from "@tanstack/react-router";
import { placeSearchWithQuery, placeSearchWithCategory, validatePlaceSearch, type PlaceFilter } from "./place-search-state";
import { useDesk } from "./store";
export { validatePlaceSearch, placeCategories } from "./place-search-state";
export type { PlaceSearch } from "./place-search-state";

/**
 * Query and category live in the route, not in `PlaceBrowser`. Typing preserves
 * the category; an explicit palette pick supplies only `q`, clearing it.
 *
 * The pages used to hand the parameter to the component as a one-shot pre-fill and key
 * the component by it (`key={...q...}`). The two roles fought: editing the box left the
 * URL claiming the old word, so picking the same place in ⌘K navigated to an identical
 * URL, nothing remounted, and the search box stayed empty — while clearing the URL
 * remounted the component and wiped what the visitor had just typed.
 *
 * Holding the value in the route fixes both: the box always shows what the URL says, the
 * palette can pre-fill the same place as often as it likes, and no key is needed because
 * a re-render is enough. Each write replaces the history entry, so typing never fills the
 * back button.
 *
 * The route reads the value itself (`Route.useSearch()`), because the typed `search`
 * parameter only exists in that route's context:
 *
 *   const { q } = Route.useSearch();
 *   const setQuery = usePlaceQueryWriter("/town");
 */
export function usePlaceQueryWriter(to: "/town" | "/campus"): (next: string) => void {
  const navigate = useNavigate();
  const level = useDesk((state) => state.level);
  const page = to === "/town" ? "town" : "campus";
  return (next: string) => {
    // Re-check the category against the level now: the route may have parsed `?cat=`
    // before the saved level loaded, and typing must not carry a hidden category.
    void navigate({
      to,
      search: (current) => placeSearchWithQuery(validatePlaceSearch(current, page, level), next),
      replace: true,
      resetScroll: false,
    });
  };
}

export function usePlaceCategoryWriter(to: "/town" | "/campus"): (next: PlaceFilter) => void {
  const navigate = useNavigate();
  const level = useDesk((state) => state.level);
  const page = to === "/town" ? "town" : "campus";
  return (next) => {
    void navigate({
      to,
      search: (current) => placeSearchWithCategory(validatePlaceSearch(current, page, level), next),
      replace: true,
      resetScroll: false,
    });
  };
}
