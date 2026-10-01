import { createFileRoute } from "@tanstack/react-router";
import { K12Campus } from "@/components/k12-campus";
import { PlaceBrowser } from "@/components/place-browser";
import { useDesk } from "@/lib/store";

export const Route = createFileRoute("/campus")({
  head: () => ({ meta: [{ title: "Campus · 13th Desk" }] }),
  component: CampusPage,
});

function CampusPage() {
  const level = useDesk((state) => state.level);
  if (level !== "uni") return <K12Campus level={level} />;
  return (
    <PlaceBrowser
      page="campus"
      kicker={{ en: "University of Oregon & Lane", zh: "俄勒冈大学和莱恩社区学院" }}
      title={{ en: "Where to sit", zh: "在哪坐" }}
      lead={{
        en: "Libraries, atriums, and the dining rooms that actually feed people. Hours move. The link is the authority, not this card.",
        zh: "图书馆、中庭，还有能正经吃饭的餐厅。时间会变。以链接里的官网为准，别只看这张卡片。",
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
