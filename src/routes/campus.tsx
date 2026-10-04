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
      title={{
        en: "Find your campus spot.",
        zh: "校园里的好去处。",
        es: "Encuentra tu lugar en el campus.",
        ko: "나에게 맞는 캠퍼스 공간.",
        vi: "Tìm góc riêng trong trường.",
        ja: "キャンパスで、お気に入りの場所を。",
      }}
      lead={{
        en: "Find a quiet place to study or somewhere to eat between classes. Check each official site for current hours.",
        zh: "找个安静的地方自习，或在课间好好吃一餐。开放时间请以各场所官网为准。",
        es: "Encuentra dónde estudiar o comer entre clases. Consulta los horarios en los sitios oficiales.",
        ko: "조용히 공부하거나 수업 사이에 식사할 곳을 찾아보세요. 운영 시간은 공식 사이트에서 확인하세요.",
        vi: "Tìm nơi yên tĩnh để học hoặc ăn giữa các tiết. Xem giờ mở cửa trên trang chính thức.",
        ja: "静かに勉強できる場所や、授業の合間に食事できる場所を。営業時間は公式サイトをご確認ください。",
      }}
      cats={[
        { id: "all", label: { en: "All", zh: "全部" } },
        { id: "study", label: { en: "Study", zh: "自习" } },
        { id: "dining", label: { en: "Dining", zh: "餐饮" } },
        { id: "saved", label: { en: "Pinned", zh: "收藏" } },
      ]}
    />
  );
}
