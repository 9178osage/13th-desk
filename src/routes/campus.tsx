import { createFileRoute } from "@tanstack/react-router";
import { K12Campus } from "@/components/k12-campus";
import { PlaceBrowser } from "@/components/place-browser";
import { useDesk } from "@/lib/store";

export const Route = createFileRoute("/campus")({
  head: () => ({ meta: [{ title: "Campus · Eugene Desk" }] }),
  component: CampusPage,
});

function CampusPage() {
  const level = useDesk((state) => state.level);
  if (level !== "uni") return <K12Campus level={level} />;
  return (
    <PlaceBrowser
      page="campus"
      kicker={{ en: "University of Oregon & Lane", zh: "俄勒冈大学和莱恩社区学院" }}
      title={{ en: "Places to sit", zh: "坐哪儿" }}
      lead={{
        en: "Libraries, atriums, and dining halls that actually feed you. Hours change — trust the official link, not this card.",
        zh: "图书馆、中庭，还有能正经吃饭的餐厅。时间会变——以官网链接为准，别只看这张卡片。",
      }}
      cats={[
        { id: "all", label: { en: "All", zh: "全部" } },
        { id: "study", label: { en: "Study", zh: "自习" } },
        { id: "dining", label: { en: "Dining", zh: "吃饭" } },
        { id: "saved", label: { en: "Pinned", zh: "收藏" } },
      ]}
    />
  );
}
