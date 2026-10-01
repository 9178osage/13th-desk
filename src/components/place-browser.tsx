import { useMemo, useState } from "react";
import { ExternalLink, Heart, Search } from "lucide-react";
import { areaName, forLevel, places, type PlaceCat } from "@/data/places";
import { cn } from "@/lib/cn";
import { useDesk, useLang } from "@/lib/store";
import { tr, type Copy, type Lang } from "@/lib/text";

type Filter = "all" | "saved" | PlaceCat;

export function PlaceBrowser({
  page,
  kicker,
  title,
  lead,
  cats,
}: {
  page: "campus" | "town";
  kicker: Copy;
  title: Copy;
  lead: Copy;
  cats: { id: Filter; label: Copy }[];
}) {
  const lang = useLang();
  const level = useDesk((state) => state.level);
  const favs = useDesk((state) => state.buckets[state.level].favs);
  const toggleFav = useDesk((state) => state.toggleFav);
  const [cat, setCat] = useState<Filter>("all");
  const [query, setQuery] = useState("");

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
        const hay = `${place.name} ${place.blurb.en} ${place.blurb.zh} ${areaName[place.area].en} ${areaName[place.area].zh}`.toLowerCase();
        return hay.includes(q);
      });
  }, [page, cat, query, favs, level]);

  return (
    <div>
      <header className="mb-6 border-b border-ink pb-4">
        <p className="text-xs uppercase tracking-widest text-muted">{tr(lang, kicker)}</p>
        <h1 className="mt-1 font-display text-4xl text-ink md:text-5xl">{tr(lang, title)}</h1>
        <p className="mt-3 max-w-2xl text-muted">{tr(lang, lead)}</p>
      </header>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{tr(lang, { en: "Search places", zh: "搜索地点" })}</span>
          <Search className="pointer-events-none absolute left-3 top-3 size-5 text-muted" aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tr(lang, { en: "Search a room, a meal, a hill", zh: "搜教室、吃饭的地方、山" })}
            className="min-h-11 w-full rounded-md border border-line bg-card pr-3 pl-10 text-ink placeholder:text-muted"
          />
        </label>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {cats.map((item) => {
          const on = cat === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={on}
              onClick={() => setCat(item.id)}
              className={cn(
                "min-h-11 rounded-full px-4 text-sm",
                on ? "bg-ink text-card" : "border border-line bg-card text-ink",
              )}
            >
              {tr(lang, item.label)}
            </button>
          );
        })}
      </div>
      {list.length === 0 ? (
        <p className="rounded-lg border border-line bg-card px-4 py-8 text-center text-muted">
          {tr(lang, {
            en: "Nothing under that filter. Try another word, or pin a place first.",
            zh: "这个筛选下面是空的。换个词，或者先收藏一个地方。",
          })}
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {list.map((place) => {
            const saved = favs.includes(place.id);
            return (
              <li key={place.id}>
                <article className="flex h-full flex-col gap-3 rounded-lg border border-line bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted">
                        {tr(lang, areaName[place.area])}
                      </p>
                      <h2 className="font-display text-2xl text-ink">{place.name}</h2>
                    </div>
                    <button
                      type="button"
                      aria-pressed={saved}
                      aria-label={
                        saved
                          ? tr(lang, { en: "Unpin", zh: "取消收藏" }) + " " + place.name
                          : tr(lang, { en: "Pin", zh: "收藏" }) + " " + place.name
                      }
                      onClick={() => toggleFav(place.id)}
                      className={cn(
                        "grid size-11 shrink-0 place-items-center rounded-full border",
                        saved ? "border-moss bg-moss-soft text-moss" : "border-line text-muted",
                      )}
                    >
                      <Heart className={cn("size-5", saved && "fill-current")} aria-hidden />
                    </button>
                  </div>
                  <p className="text-sm text-muted">{tr(lang, place.blurb)}</p>
                  {place.href ? (
                    <a
                      href={place.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto inline-flex min-h-11 items-center gap-1 text-sm text-moss"
                    >
                      {tr(lang, { en: "Official page", zh: "官方页面" })}
                      <ExternalLink className="size-4" aria-hidden />
                    </a>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
