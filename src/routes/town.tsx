import { createFileRoute } from "@tanstack/react-router";
import { PlaceBrowser } from "@/components/place-browser";
import { useDesk } from "@/lib/store";

export const Route = createFileRoute("/town")({
  head: () => ({ meta: [{ title: "Town · 13th Desk" }] }),
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
      title={young ? { en: "Out of school", zh: "放学之后" } : { en: "The town", zh: "尤金市区" }}
      lead={
        level === "elem"
          ? {
              en: "Parks, the Saturday market, and a breakfast that is not the cafeteria. Coffee shops are on the high school and university desks.",
              zh: "公园、周六市集，还有食堂以外的早饭。咖啡馆写在高中和大学的页面里。",
            }
          : level === "mid"
            ? {
                en: "Somewhere to eat that is not the cafeteria, and a hill when the week is long.",
                zh: "食堂外面吃饭的地方，还有想出门走走时可以去的山。",
              }
            : {
                en: "Coffee, a cheap meal, a hill, and the errands that are not the Duck Store. Whiteaker and downtown are where the city starts.",
                zh: "咖啡、便宜的一餐、可以走走的山，还有 Duck Store 以外要办的事。想看校园外面，去 Whiteaker 和市中心。",
              }
      }
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
