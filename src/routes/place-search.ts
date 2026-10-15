import { useNavigate } from "@tanstack/react-router";

/** The search-param shape both place pages validate (`?q=`). */
export type PlaceSearch = { q?: string };

/**
 * The `?q=` place search, held by the route instead of by `PlaceBrowser`.
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
  return (next: string) => {
    void navigate({ to, search: next ? { q: next } : {}, replace: true, resetScroll: false });
  };
}
