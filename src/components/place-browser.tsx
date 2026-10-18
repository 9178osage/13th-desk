import { useMemo } from "react";
import { ExternalLink, Heart, MapPinned, Search } from "lucide-react";
import { areaName, forLevel, places, type AreaId, type Place } from "@/data/places";
import { Card, Chip, EmptyState, Input, SectionHeader } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useDesk, useLang } from "@/lib/store";
import { tr, type Copy } from "@/lib/text";
import { deskText as c } from "@/lib/desk-copy";
import { placeHours } from "@/data/place-hours";

import type { PlaceFilter } from "@/lib/place-search-state";

const AREA_ORDER: AreaId[] = ["campus", "west", "downtown", "whit", "river", "south", "lcc"];

function mapsUrl(place: Place): string {
  const q = encodeURIComponent(`${place.name} Eugene OR`);
  return `https://maps.apple.com/?q=${q}`;
}

function googleMapsUrl(place: Place): string {
  const q = encodeURIComponent(`${place.name} Eugene, OR`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function PlaceBrowser({
  page,
  kicker,
  title,
  lead,
  cats,
  query,
  onQueryChange,
  category,
  onCategoryChange,
}: {
  page: "campus" | "town";
  kicker: Copy;
  title: Copy;
  lead: Copy;
  cats: { id: PlaceFilter; label: Copy }[];
  /** The search text lives in the route (`?q=`), so this component stays controlled. */
  query: string;
  onQueryChange: (next: string) => void;
  category?: PlaceFilter;
  onCategoryChange: (next: PlaceFilter) => void;
}) {
  const lang = useLang();
  const level = useDesk((state) => state.level);
  const favs = useDesk((state) => state.buckets[state.level].favs);
  const toggleFav = useDesk((state) => state.toggleFav);
  const hydrated = useDesk((state) => state.hydrated);
  const cat = category && cats.some((item) => item.id === category) ? category : "all";

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return places
      .filter((place) => place.page === page)
      .filter((place) => forLevel(place, level))
      .filter((place) => {
        if (cat === "all") return true;
        if (cat === "saved") return favs.includes(place.id);
        return place.cat === cat;
      })
      .filter((place) => {
        if (!q) return true;
        // Fold exactly like the query above: mixing toLowerCase() with
        // toLocaleLowerCase() makes a few characters (e.g. "İ") stop matching.
        const hay = [
          place.name,
          ...Object.values(place.blurb),
          tr(lang, place.blurb),
          ...Object.values(areaName[place.area]),
          tr(lang, areaName[place.area]),
          place.hours ? placeHours(lang, place.hours) : "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
  }, [page, cat, query, favs, level, lang]);

  const grouped = useMemo(() => {
    const map = new Map<AreaId, Place[]>();
    for (const place of list) {
      const bucket = map.get(place.area) ?? [];
      bucket.push(place);
      map.set(place.area, bucket);
    }
    return AREA_ORDER.filter((id) => map.has(id)).map((id) => ({
      id,
      places: map.get(id)!,
    }));
  }, [list]);

  return (
    <div>
      <header className="mb-6 border-b border-ink/80 pb-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
          {tr(lang, kicker)}
        </p>
        <h1 className="mt-1 font-display text-4xl text-ink md:text-5xl">{tr(lang, title)}</h1>
        <p className="mt-3 max-w-2xl text-muted">{tr(lang, lead)}</p>
      </header>

      <div className="mb-4">
        <label className="relative block min-w-0">
          <span className="sr-only">{tr(lang, { en: "Search places", zh: "搜索地点" })}</span>
          <Search
            className="pointer-events-none absolute left-3 top-3 size-5 text-muted"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={c(lang, "search")}
            className="pl-10"
          />
        </label>
      </div>

      <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
        {cats.map((item) => (
          <Chip
            key={item.id}
            active={cat === item.id}
            pressed={cat === item.id}
            onClick={() => onCategoryChange(item.id)}
          >
            {tr(lang, item.label)}
          </Chip>
        ))}
      </div>

      <div className="search-results">
        <span role="status">{c(lang, "results", { n: list.length })}</span>
        {query && <button onClick={() => onQueryChange("")}>{c(lang, "clear")}</button>}
      </div>
      {list.length === 0 ? (
        <EmptyState
          title={tr(lang, { en: "Nothing matches", zh: "没有找到匹配的地点" })}
          body={tr(lang, {
            en: "Try another word, clear the search, or pin a place from Campus or Town first.",
            zh: "试试其他关键词或分类。收藏夹中只会显示你已收藏的地点。",
          })}
        />
      ) : (
        <div className="flex flex-col gap-8">
          {grouped.map((group) => (
            <section key={group.id}>
              <SectionHeader
                className="mb-3"
                kicker={tr(lang, { en: "Area", zh: "片区" })}
                title={tr(lang, areaName[group.id])}
              />
              <ul className="grid gap-3 md:grid-cols-2">
                {group.places.map((place) => {
                  const saved = favs.includes(place.id);
                  return (
                    <li key={place.id}>
                      <Card className="lift-hover flex h-full flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="mb-1.5 flex flex-wrap gap-1.5">
                              <Chip>{tr(lang, areaName[place.area])}</Chip>
                              {place.hours ? (
                                // Long translated hours (Spanish) must wrap, not widen the page at 390px.
                                <Chip className="max-w-full shrink rounded-2xl py-1">
                                  {placeHours(lang, place.hours)}
                                </Chip>
                              ) : null}
                            </div>
                            <h2 className="font-display text-2xl text-ink">{place.name}</h2>
                          </div>
                          <button
                            type="button"
                            aria-pressed={saved}
                            disabled={!hydrated}
                            aria-label={
                              (saved
                                ? tr(lang, { en: "Unpin", zh: "取消收藏" })
                                : tr(lang, { en: "Pin", zh: "收藏" })) +
                              " " +
                              place.name
                            }
                            onClick={() => toggleFav(place.id)}
                            className={cn(
                              "grid size-11 shrink-0 place-items-center rounded-full border",
                              saved
                                ? "border-moss bg-moss-soft text-moss"
                                : "border-line text-muted",
                            )}
                          >
                            <Heart className={cn("size-5", saved && "fill-current")} aria-hidden />
                          </button>
                        </div>
                        <p className="text-sm text-muted">{tr(lang, place.blurb)}</p>
                        <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-1">
                          <a
                            href={mapsUrl(place)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-11 items-center gap-1 text-sm text-moss"
                          >
                            <MapPinned className="size-4" aria-hidden />
                            {tr(lang, { en: "Maps", zh: "地图" })}
                          </a>
                          <a
                            href={googleMapsUrl(place)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-11 items-center gap-1 text-sm text-muted hover:text-moss"
                          >
                            {tr(lang, { en: "Google Maps", zh: "谷歌地图" })}
                          </a>
                          {place.href ? (
                            <a
                              href={place.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex min-h-11 items-center gap-1 text-sm text-moss"
                            >
                              {tr(lang, { en: "Official site", zh: "官网" })}
                              <ExternalLink className="size-4" aria-hidden />
                            </a>
                          ) : null}
                        </div>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
