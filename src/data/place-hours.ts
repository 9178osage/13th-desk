import { tr, type Copy, type Lang } from "../lib/text.ts";

// Keep the original English labels as stable keys; every label has all six languages.
const rows: [string, string, string, string, string, string][] = [
  ["Varies · check library hours (finals shift)", "开放时间不固定；期末请查图书馆公告", "Horario variable; consulta los cambios de exámenes", "운영 시간 변동 · 시험 기간 공지 확인", "Giờ mở cửa thay đổi; xem lịch mùa thi", "開館時間は変動・試験期は要確認"],
  ["Weekdays daytime · quieter evenings than Knight", "工作日白天开放；晚间通常比 Knight 安静", "Abre entre semana; tardes más tranquilas que Knight", "평일 낮 운영 · 저녁은 Knight보다 한적한 편", "Mở ban ngày trong tuần; buổi tối thường yên hơn Knight", "平日昼間・夕方はKnightより静かな傾向"],
  ["EMU open hours · late on weeknights in term", "按 EMU 开放时间；学期内平日晚间较晚关闭", "Horario del EMU; cierra tarde entre semana durante el curso", "EMU 운영 시간 · 학기 중 평일 야간 개방", "Theo giờ EMU; mở muộn các tối trong tuần khi đang học", "EMUの開館時間・学期中の平日は夜間も開館"],
  ["Building hours · atrium open most weekdays", "按楼宇开放时间；中庭多数工作日开放", "Horario del edificio; atrio abierto la mayoría de días laborables", "건물 운영 시간 · 아트리움은 대체로 평일 개방", "Theo giờ tòa nhà; sảnh thường mở ngày thường", "建物の開館時間・アトリウムは主に平日開放"],
  ["Tue–Sun · often free for students", "周二至周日；学生通常可免费入场", "Martes a domingo; suele ser gratis para estudiantes", "화~일 · 학생은 무료인 경우가 많아요", "Thứ Ba–Chủ nhật; thường miễn phí cho sinh viên", "火〜日・学生は無料の場合あり"],
  ["Daylight · weather permitting", "适合白天前往，注意天气", "De día, si el tiempo lo permite", "낮 시간 · 날씨 확인", "Đi ban ngày, khi thời tiết phù hợp", "日中・天候を確認"],
  ["Law school hours · quietest midweek", "按法学院开放时间；周中较安静", "Horario de Derecho; más tranquilo a mitad de semana", "로스쿨 운영 시간 · 주중 중반이 한적해요", "Theo giờ trường Luật; thường yên nhất giữa tuần", "法学部の開館時間・週の半ばが比較的静か"],
  ["See Lane calendar · closed some Fridays in summer", "请查 Lane 校历；暑期部分周五关闭", "Consulta el calendario de Lane; algunos viernes de verano cierra", "Lane 일정 확인 · 여름에는 일부 금요일 휴관", "Xem lịch Lane; đóng cửa một số thứ Sáu mùa hè", "Laneの予定を確認・夏季の一部金曜は休館"],
  ["Lunch through dinner · weekends shorter", "午餐至晚餐时段；周末营业时间较短", "De almuerzo a cena; horario reducido los fines de semana", "점심~저녁 · 주말 단축 운영", "Từ bữa trưa đến tối; cuối tuần mở ngắn hơn", "昼食〜夕食・週末は短縮営業"],
  ["Meal-plan hours · weekends move", "按餐饮计划供餐；周末时段可能调整", "Horario del plan de comidas; cambia los fines de semana", "식사 플랜 시간 · 주말 변동", "Theo lịch suất ăn; cuối tuần có thể đổi giờ", "食事プランの時間・週末は変更あり"],
  ["Meal-plan hours · check housing", "供餐时段请查住宿部门公告", "Consulta el horario de comidas con alojamiento", "식사 시간은 기숙사 안내 확인", "Xem giờ phục vụ trên trang nhà ở sinh viên", "食事時間は学生寮の案内を確認"],
  ["Evenings in Unthank · limited groceries", "Unthank 内，晚间可去；食品种类有限", "En Unthank por la tarde; selección limitada de alimentos", "Unthank 내 저녁 이용 · 식료품 종류 제한", "Buổi tối tại Unthank; thực phẩm có hạn", "Unthank内・夕方営業・食品の品ぞろえは限定的"],
  ["Morning through evening · 13th Ave", "早晨至晚间；位于 13 街", "De la mañana a la tarde; 13th Ave", "아침~저녁 · 13th Ave", "Từ sáng đến tối; đường 13th Ave", "朝〜夕方・13th Ave沿い"],
  ["Weekday cafe hours · laptop-friendly", "工作日咖啡馆时段；适合带电脑", "Horario de cafetería entre semana; admite portátiles", "평일 카페 시간 · 노트북 사용하기 좋아요", "Giờ quán ngày thường; phù hợp dùng máy tính", "平日のカフェ営業・パソコン利用向き"],
  ["Morning pastry · closes mid-afternoon", "早晨供应糕点；下午较早关门", "Bollería por la mañana; cierra a media tarde", "아침 베이커리 · 오후 중반 마감", "Bánh ngọt buổi sáng; đóng cửa giữa chiều", "朝の焼き菓子・午後半ばに閉店"],
  ["Cafe hours · downtown pour", "市中心咖啡馆，按店铺时间营业", "Cafetería en el centro; consulta el horario", "도심 카페 · 매장 운영 시간 확인", "Quán cà phê trung tâm; xem giờ của quán", "中心街のカフェ・営業時間を確認"],
  ["Lunch & dinner · Whiteaker", "午餐和晚餐；位于 Whiteaker", "Almuerzo y cena; Whiteaker", "점심·저녁 · Whiteaker", "Bữa trưa và tối; Whiteaker", "昼食・夕食・Whiteaker地区"],
  ["Lunch through early evening", "午餐至傍晚时段", "Del almuerzo al principio de la tarde-noche", "점심~초저녁", "Từ bữa trưa đến đầu buổi tối", "昼食〜夕方"],
  ["Brunch stretch · Sunday wait", "早午餐时段；周日可能排队", "Horario de brunch; suele haber espera los domingos", "브런치 시간 · 일요일 대기 가능", "Giờ ăn sáng muộn; Chủ nhật có thể phải đợi", "ブランチ営業・日曜は待つ場合あり"],
  ["Breakfast all day · booth hours", "全天供应早餐；营业时间请查店铺", "Desayuno todo el día; consulta el horario", "영업 중 종일 아침 메뉴 · 매장 시간 확인", "Phục vụ món sáng cả ngày; xem giờ mở cửa", "営業時間中は朝食メニューあり・営業時間を確認"],
  ["Afternoon & evening scoops", "下午和晚间供应冰淇淋", "Helados por la tarde y la noche", "오후·저녁 아이스크림", "Kem vào buổi chiều và tối", "午後・夕方のアイスクリーム"],
  ["Saturdays in season · ~10–4", "集市季的周六，约 10:00–16:00", "Sábados de temporada, aprox. 10–16 h", "시즌 중 토요일 · 약 10~16시", "Thứ Bảy trong mùa; khoảng 10–16 giờ", "開催シーズンの土曜・約10〜16時"],
  ["Dinner · reservations help", "晚餐时段，建议提前订位", "Cena; conviene reservar", "저녁 식사 · 예약 권장", "Bữa tối; nên đặt bàn", "夕食・予約がおすすめ"],
  ["Daytime stalls · same building as Marché", "白天营业；与 Marché 位于同一栋楼", "Puestos de día; mismo edificio que Marché", "낮 시간 매장 · Marché와 같은 건물", "Các quầy ban ngày; cùng tòa nhà với Marché", "日中の店舗・Marchéと同じ建物"],
  ["Dawn to dusk · lights help after dark", "适合天亮至黄昏前往；夜间请带照明", "Del amanecer al anochecer; lleva luz si oscurece", "새벽~해질녘 권장 · 어두울 때 조명 지참", "Nên đi từ sáng đến chạng vạng; mang đèn nếu trời tối", "明るい時間がおすすめ・暗い時はライトを持参"],
  ["Daylight hike · ~1 hr up", "建议白天徒步；上山约 1 小时", "Ruta diurna; aprox. una hora de subida", "낮 시간 하이킹 · 오르막 약 1시간", "Đi bộ ban ngày; lên đỉnh khoảng 1 giờ", "日中のハイキング・登りは約1時間"],
  ["Short climb · sunset worth it", "短程登高，可欣赏日落", "Subida corta con vistas al atardecer", "짧은 오르막 · 노을 감상", "Đoạn leo ngắn; có thể ngắm hoàng hôn", "短い登り・夕日を楽しめる場所"],
  ["All day · lights after dusk", "全天可去；天黑后请带照明", "Todo el día; lleva luz al anochecer", "종일 이용 · 해진 뒤 조명 지참", "Có thể đi cả ngày; mang đèn khi trời tối", "終日・日没後はライトを持参"],
  ["Park hours · rhododendrons in spring", "按公园开放时间；春季可赏杜鹃", "Horario del parque; rododendros en primavera", "공원 운영 시간 · 봄철 진달래과 꽃", "Theo giờ công viên; ngắm đỗ quyên mùa xuân", "公園の開園時間・春はシャクナゲ"],
  ["Sat in season · ~Apr–Nov, 10–4", "约 4–11 月的周六，10:00–16:00", "Sábados de temporada, aprox. abr.–nov., 10–16 h", "시즌 중 토요일 · 약 4~11월, 10~16시", "Thứ Bảy trong mùa; khoảng tháng 4–11, 10–16 giờ", "開催シーズンの土曜・約4〜11月、10〜16時"],
  ["Indoor · useful Oct–May", "室内场所，适合 10 月至次年 5 月雨季", "Interior; buena opción de octubre a mayo", "실내 · 10~5월에 편리해요", "Trong nhà; phù hợp từ tháng 10 đến tháng 5", "屋内・10〜5月に便利"],
  ["Retail hours · textbook rush weeks", "按商店营业时间；教材购买高峰期较忙", "Horario comercial; más concurrido al comprar libros", "매장 운영 시간 · 교재 구매철 혼잡", "Theo giờ bán lẻ; đông vào mùa mua giáo trình", "店舗の営業時間・教科書購入期は混雑"],
  ["LTD hub · EmX all day", "LTD 公交枢纽；EmX 日间持续运营", "Intercambiador LTD; EmX durante el día", "LTD 환승 거점 · EmX 주간 운행", "Trung tâm LTD; EmX chạy trong ngày", "LTDの交通拠点・EmXは日中運行"],
  ["Supermarket hours · not campus snack", "按超市营业时间；适合日常买菜", "Horario de supermercado; para la compra diaria", "슈퍼마켓 운영 시간 · 일상 장보기", "Theo giờ siêu thị; mua thực phẩm hằng ngày", "スーパーの営業時間・日々の買い物向け"],
];

export const PLACE_HOURS: Record<string, Required<Copy>> = Object.fromEntries(
  rows.map(([en, zh, es, ko, vi, ja]) => [en, { en, zh, es, ko, vi, ja }]),
);
export function placeHours(lang: Lang, hours: string): string {
  return tr(lang, PLACE_HOURS[hours] ?? { en: hours });
}
