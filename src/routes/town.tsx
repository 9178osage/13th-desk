import { createFileRoute } from "@tanstack/react-router";
import { PlaceBrowser } from "@/components/place-browser";
import { useDesk } from "@/lib/store";

export const Route = createFileRoute("/town")({
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

function TownPage() {
  const level = useDesk((state) => state.level);
  const young = level === "elem" || level === "mid";
  return (
    <PlaceBrowser
      key={level}
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
      cats={
        young
          ? [
              { id: "all", label: { en: "All", zh: "全部" } },
              { id: "eat", label: { en: "Eat", zh: "吃" } },
              { id: "out", label: { en: "Outside", zh: "出门" } },
              { id: "errand", label: { en: "Errands", zh: "办事" } },
              { id: "saved", label: { en: "Pinned", zh: "收藏" } },
            ]
          : [
              { id: "all", label: { en: "All", zh: "全部" } },
              { id: "coffee", label: { en: "Coffee", zh: "咖啡" } },
              { id: "eat", label: { en: "Eat", zh: "吃" } },
              { id: "out", label: { en: "Outside", zh: "出门" } },
              { id: "errand", label: { en: "Errands", zh: "办事" } },
              { id: "saved", label: { en: "Pinned", zh: "收藏" } },
            ]
      }
    />
  );
}
