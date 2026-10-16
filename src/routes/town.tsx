import { createFileRoute } from "@tanstack/react-router";
import { PlaceBrowser } from "@/components/place-browser";
import { usePlaceQueryWriter, usePlaceCategoryWriter, usePlaceCategoryGuard, parsePlaceSearch, effectivePlaceCategory, placeCategories } from "@/lib/place-search";
import type { Copy } from "@/lib/text";
import { useDesk } from "@/lib/store";

export const Route = createFileRoute("/town")({
  // ?q= is the place search itself, not a one-shot pre-fill (see place-search.ts).
  // Only a static whitelist here: the route parses before the saved level is known.
  // The page applies `effectivePlaceCategory` and drops a ?cat= the level hides.
  validateSearch: (search: Record<string, unknown>) => parsePlaceSearch(search, "town"),
  head: () => ({
    meta: [
      { title: "Town · Eugene Desk" },
      {
        name: "description",
        content:
          "Libraries, parks, cafés, and quiet places to study or take a break around Eugene, Oregon.",
      },
    ],
  }),
  component: TownPage,
});

const TOWN_LABELS: Record<ReturnType<typeof placeCategories>[number], Copy> = {
  coffee: { en: "Coffee", zh: "咖啡" },
  eat: { en: "Eat", zh: "吃" },
  out: { en: "Outside", zh: "出门" },
  errand: { en: "Errands", zh: "办事" },
  saved: { en: "Pinned", zh: "收藏" },
  study: { en: "Study", zh: "自习" },
  dining: { en: "Dining", zh: "餐饮" },
};

function TownPage() {
  const level = useDesk((state) => state.level);
  const { q, cat: rawCat } = Route.useSearch();
  usePlaceCategoryGuard("/town", rawCat);
  const cat = effectivePlaceCategory(rawCat, "town", level);
  const setQuery = usePlaceQueryWriter("/town");
  const setCategory = usePlaceCategoryWriter("/town");
  const young = level === "elem" || level === "mid";
  return (
    <PlaceBrowser
      query={q ?? ""}
      onQueryChange={setQuery}
      category={cat}
      onCategoryChange={setCategory}
      page="town"
      kicker={
        young
          ? { en: "After school", zh: "放学以后" }
          : { en: "Eugene, off the clock", zh: "校园外面的尤金" }
      }
      title={{
        en: "A little more Eugene.",
        zh: "课余，逛逛尤金。",
        es: "Un poco más de Eugene.",
        ko: "유진을 더 가까이.",
        vi: "Khám phá thêm về Eugene.",
        ja: "ユージンを、もう少し。",
      }}
      lead={{
        en: "Find a place for lunch, a walk, or your everyday errands. Save a few favorites for later.",
        zh: "找一顿午餐、一条散步路线，或日常办事的去处。喜欢的地点可以先收藏，下次再去。",
        es: "Encuentra dónde comer, pasear o hacer recados. Guarda tus favoritos para después.",
        ko: "점심 먹을 곳, 산책로, 일상에 필요한 장소를 찾아보세요. 마음에 드는 곳은 저장해 두세요.",
        vi: "Tìm nơi ăn trưa, đi dạo hoặc làm việc thường ngày. Lưu các địa điểm yêu thích để ghé sau.",
        ja: "ランチ、散歩、毎日の用事に。気になる場所は保存して、また今度。",
      }}
      cats={[
        { id: "all" as const, label: { en: "All", zh: "全部" } },
        ...placeCategories("town", level).map((id) => ({ id, label: TOWN_LABELS[id] })),
      ]}
    />
  );
}
