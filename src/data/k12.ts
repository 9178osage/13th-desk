import type { Deadline } from "@/data/guide";
import type { Level } from "@/lib/levels";
import type { Copy } from "@/lib/text";

export const elemBells: { id: string; time: Copy; wed: Copy; schools: string[] }[] = [
  {
    id: "early",
    time: { en: "7:55 a.m.–2:25 p.m.", zh: "上午 7:55 – 下午 2:25" },
    wed: { en: "Wednesdays out at 1:10 p.m.", zh: "周三 1:10 放学" },
    schools: [
      "Camas Ridge",
      "Chávez",
      "Chinese Immersion",
      "Family School",
      "Gilham",
      "Holt",
      "Howard",
      "Spring Creek",
      "Twin Oaks",
    ],
  },
  {
    id: "later",
    time: { en: "8:30 a.m.–3:00 p.m.", zh: "上午 8:30 – 下午 3:00" },
    wed: { en: "Wednesdays out at 1:45 p.m.", zh: "周三 1:45 放学" },
    schools: [
      "Adams",
      "Awbrey Park",
      "Buena Vista",
      "Charlemagne",
      "Edgewood",
      "Edison",
      "McCornack",
      "River Road",
      "Willagillespie",
      "Yujin Gakuen",
    ],
  },
];

export type SchoolCard = {
  id: string;
  name: string;
  district: "4j" | "bethel" | "other";
  bellGroup?: string;
  bell?: Copy;
  wed?: Copy;
  note?: Copy;
  href?: string;
};

export const elemSchools: SchoolCard[] = [
  // early bell
  {
    id: "camas",
    name: "Camas Ridge",
    district: "4j",
    bellGroup: "early",
    bell: { en: "7:55 a.m.–2:25 p.m.", zh: "上午 7:55 – 下午 2:25" },
    wed: { en: "Wed out 1:10 p.m.", zh: "周三 1:10 放学" },
    href: "https://www.4j.lane.edu/",
  },
  {
    id: "chavez",
    name: "Chávez",
    district: "4j",
    bellGroup: "early",
    bell: { en: "7:55 a.m.–2:25 p.m.", zh: "上午 7:55 – 下午 2:25" },
    wed: { en: "Wed out 1:10 p.m.", zh: "周三 1:10 放学" },
    href: "https://www.4j.lane.edu/",
  },
  {
    id: "chinese",
    name: "Chinese Immersion",
    district: "4j",
    bellGroup: "early",
    bell: { en: "7:55 a.m.–2:25 p.m.", zh: "上午 7:55 – 下午 2:25" },
    wed: { en: "Wed out 1:10 p.m.", zh: "周三 1:10 放学" },
    note: { en: "Language immersion program.", zh: "语言沉浸项目。" },
    href: "https://www.4j.lane.edu/",
  },
  {
    id: "family",
    name: "Family School",
    district: "4j",
    bellGroup: "early",
    bell: { en: "7:55 a.m.–2:25 p.m.", zh: "上午 7:55 – 下午 2:25" },
    wed: { en: "Wed out 1:10 p.m.", zh: "周三 1:10 放学" },
    note: { en: "Shares Camas Ridge’s building this year.", zh: "今年和 Camas Ridge 同楼。" },
    href: "https://www.4j.lane.edu/",
  },
  {
    id: "gilham",
    name: "Gilham",
    district: "4j",
    bellGroup: "early",
    bell: { en: "7:55 a.m.–2:25 p.m.", zh: "上午 7:55 – 下午 2:25" },
    wed: { en: "Wed out 1:10 p.m.", zh: "周三 1:10 放学" },
    href: "https://www.4j.lane.edu/",
  },
  {
    id: "holt",
    name: "Holt",
    district: "4j",
    bellGroup: "early",
    bell: { en: "7:55 a.m.–2:25 p.m.", zh: "上午 7:55 – 下午 2:25" },
    wed: { en: "Wed out 1:10 p.m.", zh: "周三 1:10 放学" },
    href: "https://www.4j.lane.edu/",
  },
  {
    id: "howard",
    name: "Howard",
    district: "4j",
    bellGroup: "early",
    bell: { en: "7:55 a.m.–2:25 p.m.", zh: "上午 7:55 – 下午 2:25" },
    wed: { en: "Wed out 1:10 p.m.", zh: "周三 1:10 放学" },
    href: "https://www.4j.lane.edu/",
  },
  {
    id: "spring",
    name: "Spring Creek",
    district: "4j",
    bellGroup: "early",
    bell: { en: "7:55 a.m.–2:25 p.m.", zh: "上午 7:55 – 下午 2:25" },
    wed: { en: "Wed out 1:10 p.m.", zh: "周三 1:10 放学" },
    href: "https://www.4j.lane.edu/",
  },
  {
    id: "twin",
    name: "Twin Oaks",
    district: "4j",
    bellGroup: "early",
    bell: { en: "7:55 a.m.–2:25 p.m.", zh: "上午 7:55 – 下午 2:25" },
    wed: { en: "Wed out 1:10 p.m.", zh: "周三 1:10 放学" },
    href: "https://www.4j.lane.edu/",
  },
  // later bell
  {
    id: "adams",
    name: "Adams",
    district: "4j",
    bellGroup: "later",
    bell: { en: "8:30 a.m.–3:00 p.m.", zh: "上午 8:30 – 下午 3:00" },
    wed: { en: "Wed out 1:45 p.m.", zh: "周三 1:45 放学" },
    href: "https://www.4j.lane.edu/",
  },
  {
    id: "awbrey",
    name: "Awbrey Park",
    district: "4j",
    bellGroup: "later",
    bell: { en: "8:30 a.m.–3:00 p.m.", zh: "上午 8:30 – 下午 3:00" },
    wed: { en: "Wed out 1:45 p.m.", zh: "周三 1:45 放学" },
    href: "https://www.4j.lane.edu/",
  },
  {
    id: "buena",
    name: "Buena Vista",
    district: "4j",
    bellGroup: "later",
    bell: { en: "8:30 a.m.–3:00 p.m.", zh: "上午 8:30 – 下午 3:00" },
    wed: { en: "Wed out 1:45 p.m.", zh: "周三 1:45 放学" },
    note: { en: "Spanish immersion.", zh: "西班牙语沉浸。" },
    href: "https://www.4j.lane.edu/",
  },
  {
    id: "charlemagne",
    name: "Charlemagne",
    district: "4j",
    bellGroup: "later",
    bell: { en: "8:30 a.m.–3:00 p.m.", zh: "上午 8:30 – 下午 3:00" },
    wed: { en: "Wed out 1:45 p.m.", zh: "周三 1:45 放学" },
    note: { en: "French immersion.", zh: "法语沉浸。" },
    href: "https://www.4j.lane.edu/",
  },
  {
    id: "edgewood",
    name: "Edgewood",
    district: "4j",
    bellGroup: "later",
    bell: { en: "8:30 a.m.–3:00 p.m.", zh: "上午 8:30 – 下午 3:00" },
    wed: { en: "Wed out 1:45 p.m.", zh: "周三 1:45 放学" },
    href: "https://www.4j.lane.edu/",
  },
  {
    id: "edison",
    name: "Edison",
    district: "4j",
    bellGroup: "later",
    bell: { en: "8:30 a.m.–3:00 p.m.", zh: "上午 8:30 – 下午 3:00" },
    wed: { en: "Wed out 1:45 p.m.", zh: "周三 1:45 放学" },
    href: "https://www.4j.lane.edu/",
  },
  {
    id: "mccornack",
    name: "McCornack",
    district: "4j",
    bellGroup: "later",
    bell: { en: "8:30 a.m.–3:00 p.m.", zh: "上午 8:30 – 下午 3:00" },
    wed: { en: "Wed out 1:45 p.m.", zh: "周三 1:45 放学" },
    href: "https://www.4j.lane.edu/",
  },
  {
    id: "riverroad",
    name: "River Road",
    district: "4j",
    bellGroup: "later",
    bell: { en: "8:30 a.m.–3:00 p.m.", zh: "上午 8:30 – 下午 3:00" },
    wed: { en: "Wed out 1:45 p.m.", zh: "周三 1:45 放学" },
    href: "https://www.4j.lane.edu/",
  },
  {
    id: "willa",
    name: "Willagillespie",
    district: "4j",
    bellGroup: "later",
    bell: { en: "8:30 a.m.–3:00 p.m.", zh: "上午 8:30 – 下午 3:00" },
    wed: { en: "Wed out 1:45 p.m.", zh: "周三 1:45 放学" },
    href: "https://www.4j.lane.edu/",
  },
  {
    id: "yujin",
    name: "Yujin Gakuen",
    district: "4j",
    bellGroup: "later",
    bell: { en: "8:30 a.m.–3:00 p.m.", zh: "上午 8:30 – 下午 3:00" },
    wed: { en: "Wed out 1:45 p.m.", zh: "周三 1:45 放学" },
    note: { en: "Japanese immersion.", zh: "日语沉浸。" },
    href: "https://www.4j.lane.edu/",
  },
];

export const midSchools: SchoolCard[] = [
  {
    id: "roosevelt",
    name: "Roosevelt",
    district: "4j",
    bell: { en: "9:00 a.m.–3:40 p.m.", zh: "上午 9:00 – 下午 3:40" },
    wed: { en: "Wed out 2:35 p.m.", zh: "周三 2:35 放学" },
    href: "https://www.4j.lane.edu/",
  },
  {
    id: "spencer-ms",
    name: "Spencer Butte",
    district: "4j",
    bell: { en: "9:00 a.m.–3:40 p.m.", zh: "上午 9:00 – 下午 3:40" },
    wed: { en: "Wed out 2:35 p.m.", zh: "周三 2:35 放学" },
    href: "https://www.4j.lane.edu/",
  },
  {
    id: "madison",
    name: "Madison",
    district: "4j",
    bell: { en: "9:00 a.m.–3:40 p.m.", zh: "上午 9:00 – 下午 3:40" },
    wed: { en: "Wed out 2:35 p.m.", zh: "周三 2:35 放学" },
    href: "https://www.4j.lane.edu/",
  },
  {
    id: "kelly",
    name: "Kelly",
    district: "4j",
    bell: { en: "9:00 a.m.–3:40 p.m.", zh: "上午 9:00 – 下午 3:40" },
    wed: { en: "Wed out 2:35 p.m.", zh: "周三 2:35 放学" },
    href: "https://www.4j.lane.edu/",
  },
  {
    id: "kennedy",
    name: "Kennedy",
    district: "4j",
    bell: { en: "9:00 a.m.–3:40 p.m.", zh: "上午 9:00 – 下午 3:40" },
    wed: { en: "Wed out 2:35 p.m.", zh: "周三 2:35 放学" },
    href: "https://www.4j.lane.edu/",
  },
  {
    id: "calyoung",
    name: "Cal Young",
    district: "4j",
    bell: { en: "9:00 a.m.–3:40 p.m.", zh: "上午 9:00 – 下午 3:40" },
    wed: { en: "Wed out 2:35 p.m.", zh: "周三 2:35 放学" },
    href: "https://www.4j.lane.edu/",
  },
  {
    id: "monroe",
    name: "Monroe",
    district: "4j",
    bell: { en: "9:00 a.m.–3:40 p.m.", zh: "上午 9:00 – 下午 3:40" },
    wed: { en: "Wed out 2:35 p.m.", zh: "周三 2:35 放学" },
    href: "https://www.4j.lane.edu/",
  },
  {
    id: "ata",
    name: "Arts & Technology Academy",
    district: "4j",
    bell: { en: "9:00 a.m.–3:40 p.m.", zh: "上午 9:00 – 下午 3:40" },
    wed: { en: "Wed out 2:35 p.m.", zh: "周三 2:35 放学" },
    href: "https://www.4j.lane.edu/",
  },
  {
    id: "cascade",
    name: "Cascade",
    district: "bethel",
    bell: { en: "See Bethel calendar", zh: "看 Bethel 校历" },
    wed: { en: "Not 4J Wednesday times", zh: "不是 4J 的周三时间" },
    note: { en: "Bethel School District.", zh: "属于 Bethel 学区。" },
    href: "https://www.bethel.k12.or.us/",
  },
];

export const highSchoolCards: SchoolCard[] = [
  {
    id: "south",
    name: "South Eugene",
    district: "4j",
    bell: { en: "8:30 a.m.–3:30 p.m.", zh: "上午 8:30 – 下午 3:30" },
    wed: { en: "Wed out 2:30 p.m.", zh: "周三 2:30 放学" },
    href: "https://www.4j.lane.edu/",
  },
  {
    id: "sheldon",
    name: "Sheldon",
    district: "4j",
    bell: { en: "8:30 a.m.–3:30 p.m.", zh: "上午 8:30 – 下午 3:30" },
    wed: { en: "Wed out 2:30 p.m.", zh: "周三 2:30 放学" },
    href: "https://www.4j.lane.edu/",
  },
  {
    id: "churchill",
    name: "Churchill",
    district: "4j",
    bell: { en: "8:30 a.m.–3:30 p.m.", zh: "上午 8:30 – 下午 3:30" },
    wed: { en: "Wed out 2:30 p.m.", zh: "周三 2:30 放学" },
    href: "https://www.4j.lane.edu/",
  },
  {
    id: "north",
    name: "North Eugene",
    district: "4j",
    bell: { en: "8:30 a.m.–3:30 p.m.", zh: "上午 8:30 – 下午 3:30" },
    wed: { en: "Wed out 2:30 p.m.", zh: "周三 2:30 放学" },
    href: "https://www.4j.lane.edu/",
  },
  {
    id: "ihs",
    name: "Eugene International",
    district: "4j",
    bell: { en: "Inside a 4J high school", zh: "在 4J 高中楼内" },
    wed: { en: "Follow your building’s Wednesday", zh: "跟所在大楼的周三时间" },
    note: {
      en: "A program inside South, Sheldon, Churchill, or North — not a fifth building.",
      zh: "在四所高中里的项目，不是第五栋楼。",
    },
    href: "https://www.4j.lane.edu/",
  },
  {
    id: "willamette",
    name: "Willamette",
    district: "bethel",
    bell: { en: "See Bethel calendar", zh: "看 Bethel 校历" },
    wed: { en: "Not 4J Wednesday times", zh: "不是 4J 的周三时间" },
    note: { en: "Bethel School District.", zh: "属于 Bethel 学区。" },
    href: "https://www.bethel.k12.or.us/",
  },
  {
    id: "kalapuya",
    name: "Kalapuya",
    district: "bethel",
    bell: { en: "See Bethel calendar", zh: "看 Bethel 校历" },
    wed: { en: "Not 4J Wednesday times", zh: "不是 4J 的周三时间" },
    note: { en: "Bethel School District.", zh: "属于 Bethel 学区。" },
    href: "https://www.bethel.k12.or.us/",
  },
];

const sharedDates: Deadline[] = [
  {
    id: "k-oct9",
    ymd: "2026-10-09",
    title: { en: "No school", zh: "停课" },
    detail: {
      en: "4J has no school for teacher planning and professional development. All grades.",
      zh: "4J 全区停课：老师备课与培训。所有年级。",
      es: "No hay clases en 4J: planificación y desarrollo profesional del profesorado. Todos los grados.",
      ko: "4J는 교사 계획·연수로 수업이 없어요. 모든 학년.",
      vi: "4J nghỉ học để giáo viên lập kế hoạch và bồi dưỡng. Tất cả các khối.",
      ja: "4Jは教員の計画・研修日のため休校です。全学年。",
    },
  },
  {
    id: "k-midterm",
    ymd: "2026-11-06",
    title: { en: "Grading day", zh: "登分日，不上课" },
    detail: {
      en: "No school for 4J students while teachers finish mid-semester grades.",
      zh: "4J 学生停课，老师完成期中登分。",
      es: "No hay clases en 4J mientras el profesorado cierra las notas de mitad de semestre.",
      ko: "4J 학생은 수업이 없고, 교사는 중간 성적을 마무리해요.",
      vi: "Học sinh 4J nghỉ học trong khi giáo viên hoàn tất điểm giữa học kỳ.",
      ja: "4Jの生徒は休校、教員は中間成績を確定します。",
    },
  },
  {
    id: "k-veterans",
    ymd: "2026-11-11",
    title: { en: "Veterans Day", zh: "退伍军人节" },
    detail: {
      en: "No school in 4J.",
      zh: "4J 停课。",
      es: "No hay clases en 4J.",
      ko: "4J는 수업이 없어요.",
      vi: "4J nghỉ học.",
      ja: "4Jは休校です。",
    },
  },
  {
    id: "k-conf",
    ymd: "2026-11-23",
    title: { en: "Conferences, then Thanksgiving", zh: "家长会，然后感恩节" },
    detail: {
      en: "4J is out November 23–27. Conference sign-up is per school.",
      zh: "4J 11 月 23 日至 27 日不上课。家长会预约看各校通知。",
      es: "En 4J no hay clases del 23 al 27 de noviembre. La inscripción a las conferencias es por escuela.",
      ko: "4J는 11월 23–27일 수업이 없어요. 학부모 상담 신청은 학교마다 달라요.",
      vi: "4J nghỉ từ 23 đến 27 tháng 11. Đăng ký họp phụ huynh tùy từng trường.",
      ja: "4Jは11月23〜27日が休みです。面談の申し込みは学校ごとです。",
    },
  },
  {
    id: "k-winter",
    ymd: "2026-12-21",
    title: { en: "Winter break", zh: "寒假" },
    detail: {
      en: "4J is out December 21 through January 4. Classes resume after the planning day.",
      zh: "4J 从 12 月 21 日放到 1 月 4 日。老师培训日过了才上课。",
      es: "En 4J no hay clases del 21 de diciembre al 4 de enero. Las clases vuelven tras el día de planificación.",
      ko: "4J는 12월 21일부터 1월 4일까지 방학이에요. 교사 계획일이 지나면 수업이 다시 시작해요.",
      vi: "4J nghỉ từ 21 tháng 12 đến 4 tháng 1. Học lại sau ngày giáo viên lập kế hoạch.",
      ja: "4Jは12月21日から1月4日まで休みです。教員計画日のあと授業が再開します。",
    },
  },
  {
    id: "k-mlk",
    ymd: "2027-01-18",
    title: { en: "MLK Day", zh: "马丁·路德·金日" },
    detail: {
      en: "No school.",
      zh: "停课。",
      es: "No hay clases.",
      ko: "수업이 없어요.",
      vi: "Không có lớp.",
      ja: "休校です。",
    },
  },
  {
    id: "k-semester",
    ymd: "2027-02-01",
    title: { en: "Semester grading day", zh: "学期登分日，不上课" },
    detail: {
      en: "No school. First semester ends and teachers finish grades.",
      zh: "不上课。第一学期结束，老师完成登分。",
      es: "No hay clases. Termina el primer semestre y el profesorado cierra las notas.",
      ko: "수업이 없어요. 1학기가 끝나고 교사가 성적을 마무리해요.",
      vi: "Không có lớp. Học kỳ một kết thúc và giáo viên hoàn tất điểm.",
      ja: "休校です。前期が終わり、教員が成績を確定します。",
    },
  },
  {
    id: "k-transition",
    ymd: "2027-02-02",
    title: { en: "Transition planning", zh: "过渡规划日，不上课" },
    detail: {
      en: "No school. Staff prepare for the second semester.",
      zh: "不上课。教职员工为下学期做准备。",
      es: "No hay clases. El personal prepara el segundo semestre.",
      ko: "수업이 없어요. 교직원이 2학기를 준비해요.",
      vi: "Không có lớp. Nhân viên chuẩn bị cho học kỳ hai.",
      ja: "休校です。教職員が後期の準備をします。",
    },
  },
  {
    id: "k-second",
    ymd: "2027-02-03",
    title: { en: "Second semester", zh: "下学期开始" },
    detail: {
      en: "Second semester begins.",
      zh: "下学期开始。",
      es: "Empieza el segundo semestre.",
      ko: "2학기가 시작돼요.",
      vi: "Học kỳ hai bắt đầu.",
      ja: "後期が始まります。",
    },
  },
  {
    id: "k-presidents",
    ymd: "2027-02-15",
    title: { en: "Presidents Day", zh: "总统日" },
    detail: {
      en: "No school. The district also lists it as a possible weather make-up day.",
      zh: "停课。学区也把它列为可能的恶劣天气补课日。",
      es: "No hay clases. El distrito también lo marca como posible día de recuperación por mal tiempo.",
      ko: "수업이 없어요. 학군은 악천후 보충 수업 가능일로도 잡아 두었어요.",
      vi: "Không có lớp. Học khu cũng ghi đây là ngày dự phòng bù do thời tiết.",
      ja: "休校です。学区は悪天候時の振替候補日にもしています。",
    },
  },
  {
    id: "k-spring",
    ymd: "2027-03-22",
    title: { en: "Spring break", zh: "春假" },
    detail: {
      en: "4J is out March 22–29: spring break, then a teacher planning day. Classes resume March 30.",
      zh: "4J 3 月 22 日至 29 日不上课：春假，之后一天老师备课。3 月 30 日复课。",
      es: "En 4J no hay clases del 22 al 29 de marzo: vacaciones de primavera y un día de planificación. Las clases vuelven el 30 de marzo.",
      ko: "4J는 3월 22–29일 수업이 없어요. 봄방학 뒤 교사 계획일이 하루 있고, 3월 30일부터 수업해요.",
      vi: "4J nghỉ từ 22 đến 29 tháng 3: nghỉ xuân rồi một ngày giáo viên lập kế hoạch. Học lại từ 30 tháng 3.",
      ja: "4Jは3月22〜29日が休みです。春休みのあと教員計画日が1日あり、3月30日から授業です。",
    },
  },
  {
    id: "k-apr",
    ymd: "2027-04-16",
    title: { en: "Grading day", zh: "登分日，不上课" },
    detail: {
      en: "No school for 4J students while teachers finish mid-semester grades.",
      zh: "4J 学生停课，老师完成期中登分。",
      es: "No hay clases en 4J mientras el profesorado cierra las notas de mitad de semestre.",
      ko: "4J 학생은 수업이 없고, 교사는 중간 성적을 마무리해요.",
      vi: "Học sinh 4J nghỉ học trong khi giáo viên hoàn tất điểm giữa học kỳ.",
      ja: "4Jの生徒は休校、教員は中間成績を確定します。",
    },
  },
  {
    id: "k-memorial",
    ymd: "2027-05-31",
    title: { en: "Memorial Day", zh: "阵亡将士纪念日" },
    detail: {
      en: "No school.",
      zh: "停课。",
      es: "No hay clases.",
      ko: "수업이 없어요.",
      vi: "Không có lớp.",
      ja: "休校です。",
    },
  },
  {
    id: "k-last",
    ymd: "2027-06-16",
    title: { en: "Last day, half day", zh: "最后一天，半天" },
    detail: {
      en: "4J’s last day is a Wednesday half day.",
      zh: "4J 最后一天是周三，只上半天。",
      es: "El último día de 4J es un miércoles de medio día.",
      ko: "4J의 마지막 수업일은 수요일 반나절이에요.",
      vi: "Ngày cuối của 4J là thứ Tư, học nửa ngày.",
      ja: "4Jの最終日は水曜の半日です。",
    },
  },
  {
    id: "k-jun-grading",
    ymd: "2027-06-17",
    title: { en: "Semester grading day", zh: "学期登分日，不上课" },
    detail: {
      en: "No school. Grades close after the last student day.",
      zh: "不上课。学生最后一天之后老师完成登分。",
      es: "No hay clases. Las notas se cierran después del último día del alumnado.",
      ko: "수업이 없어요. 학생 마지막 수업일 뒤에 성적을 마감해요.",
      vi: "Không có lớp. Điểm được chốt sau ngày học cuối của học sinh.",
      ja: "休校です。生徒の最終日のあとに成績を確定します。",
    },
  },
];

// The 4J PDF marks June 11 as no school for elementary students only.
const elementaryDate: Deadline = {
  id: "k-elem-grading",
  ymd: "2027-06-11",
  title: { en: "Elementary grading day", zh: "小学登分日，不上课" },
  detail: {
    en: "No school for elementary students; teachers finish grades.",
    zh: "小学停课，老师完成登分。",
    es: "No hay clases en primaria; el profesorado cierra las notas.",
    ko: "초등학생은 수업이 없고, 교사가 성적을 마무리해요.",
    vi: "Học sinh tiểu học nghỉ học; giáo viên hoàn tất điểm.",
    ja: "小学校は休校、教員が成績を確定します。",
  },
};

const seniorDate: Deadline = {
  id: "k-early",
  ymd: "2026-11-01",
  title: { en: "Early applications", zh: "提前申请" },
  detail: {
    en: "November 1 is a common early-action and early-decision date. Not every college uses it. Seniors check each portal.",
    zh: "11 月 1 日是很多学校提前申请的截止日期。不是每一所都这样。高三按各校门户核对。",
  },
};

export function deadlinesFor(level: Level): Deadline[] {
  const list = [...sharedDates];
  if (level === "elem") list.push(elementaryDate);
  if (level === "high") list.push(seniorDate);
  return list.sort((a, b) => a.ymd.localeCompare(b.ymd));
}

export function releaseLine(level: Level, wednesday: boolean): Copy {
  const today = wednesday
    ? {
        en: "Today is the early release. ",
        zh: "今天提前放学。",
        es: "Hoy es la salida temprana. ",
        ko: "오늘은 조기 하교예요. ",
        vi: "Hôm nay tan sớm. ",
        ja: "今日は早い下校です。",
      }
    : { en: "", zh: "", es: "", ko: "", vi: "", ja: "" };
  if (level === "elem") {
    return {
      en: `${today.en}Elementary Wednesdays end at 1:10 or 1:45, depending on the school.`,
      zh: `${today.zh}小学周三有的 1:10 放学，有的 1:45。以你自己学校的时间为准。`,
      es: `${today.es}En primaria, los miércoles terminan a la 1:10 o a la 1:45, según la escuela.`,
      ko: `${today.ko}초등학교 수요일은 학교에 따라 1:10 또는 1:45에 끝나요.`,
      vi: `${today.vi}Tiểu học ngày thứ Tư tan lúc 1:10 hoặc 1:45, tùy trường.`,
      ja: `${today.ja}小学校の水曜は、学校によって 1:10 か 1:45 に終わります。`,
    };
  }
  if (level === "mid") {
    return {
      en: `${today.en}4J middle school lets out at 2:35 on Wednesdays. Regular days run 9:00–3:40.`,
      zh: `${today.zh}尤金 4J 学区的初中，周三 2:35 放学。平时是上午 9:00 到下午 3:40。`,
      es: `${today.es}La secundaria 4J sale a las 2:35 los miércoles. Los días normales van de 9:00 a 3:40.`,
      ko: `${today.ko}4J 중학교는 수요일 2:35에 하교해요. 평일은 9:00–3:40이에요.`,
      vi: `${today.vi}Trung học cơ sở 4J tan lúc 2:35 ngày thứ Tư. Ngày thường từ 9:00 đến 3:40.`,
      ja: `${today.ja}4J の中学は水曜 2:35 下校。普段は 9:00–3:40 です。`,
    };
  }
  return {
    en: `${today.en}4J high school lets out at 2:30 on Wednesdays. Regular days run 8:30–3:30.`,
    zh: `${today.zh}尤金 4J 学区的高中，周三 2:30 放学。平时是上午 8:30 到下午 3:30。`,
    es: `${today.es}La preparatoria 4J sale a las 2:30 los miércoles. Los días normales van de 8:30 a 3:30.`,
    ko: `${today.ko}4J 고등학교는 수요일 2:30에 하교해요. 평일은 8:30–3:30이에요.`,
    vi: `${today.vi}Trung học phổ thông 4J tan lúc 2:30 ngày thứ Tư. Ngày thường từ 8:30 đến 3:30.`,
    ja: `${today.ja}4J の高校は水曜 2:30 下校。普段は 8:30–3:30 です。`,
  };
}

/**
 * `district: "4j"` marks a check that only holds for 4J (its calendar, bell times,
 * grading days); `until` is the last Eugene date it is still worth doing. Both
 * optional: the home page uses them to skip starter tasks that do not apply.
 */
export type K12Check = { id: string; label: Copy; district?: "4j"; until?: string };
export const k12Checks: Record<Exclude<Level, "uni">, K12Check[]> = {
  elem: [
    {
      id: "bell",
      label: {
        en: "Find your school on the bell list. Wednesday is not the same hour everywhere.",
        zh: "在作息表上找到自己的学校。周三放学时间不是全区一样。",
      },
    },
    {
      id: "pdf",
      district: "4j",
      label: {
        en: "Put the 4J calendar PDF somewhere you will see it. Elementary days off are not a copy of the high school list.",
        zh: "把 4J 校历 PDF 放在你会看见的地方。小学的放假日和高中不是同一张表。",
      },
    },
    {
      id: "conf",
      label: {
        en: "Sign up for November conferences before the week fills.",
        zh: "十一月家长会早点预约，别等那周满了。",
      },
    },
    {
      id: "pickup",
      label: {
        en: "Know the pickup door, and the rain plan for it.",
        zh: "弄清在哪个门接孩子，以及下雨时改在哪。",
      },
    },
    {
      id: "lunch",
      label: {
        en: "Check this year’s meal account on the district site, not last year’s instructions.",
        zh: "餐费账户看学区今年的说明，不要用去年的。",
      },
    },
    {
      id: "jacket",
      label: {
        en: "A jacket by the door. October is when Eugene starts meaning it.",
        zh: "门边放一件外套。十月起，尤金的雨是真下的。",
      },
    },
    {
      id: "card",
      label: {
        en: "Get a public library card. It is the weekday backup when school is out.",
        zh: "办一张公共图书馆的证。放学和停课日用得上。",
      },
    },
    {
      id: "district",
      label: {
        en: "Bethel and Springfield families: use that district’s calendar, not 4J’s.",
        zh: "如果在 Bethel 或 Springfield，用他们自己的校历，不要套 4J。",
      },
    },
  ],
  mid: [
    {
      id: "pass",
      label: {
        en: "Passing periods are short. Learn the locker stop before you need it on a rainy day.",
        zh: "课间很短。下雨之前先走一遍，从柜子到教室要多久。",
      },
    },
    {
      id: "wed",
      district: "4j",
      label: {
        en: "Wednesday release is 2:35. Rides that assume 3:40 will be late.",
        zh: "周三 2:35 放学。还按 3:40 来接的人会晚到。",
      },
    },
    {
      id: "grade",
      district: "4j",
      until: "2026-11-06",
      label: {
        en: "November 6 is a grading day with no school.",
        zh: "11 月 6 日是登分日，不上课。",
      },
    },
    {
      id: "sport",
      label: {
        en: "Sports need a physical. Ask the school before the first practice, not at the door.",
        zh: "运动队要体检。第一次训练前问学校，别到门口才问。",
      },
    },
    {
      id: "portal",
      label: {
        en: "Open whatever portal the school emailed. Grades will not arrive by group chat.",
        zh: "打开学校发来的那个系统。成绩不会发在群里。",
      },
    },
    {
      id: "conf",
      label: {
        en: "November conferences are still a thing in middle school.",
        zh: "初中十一月也有家长会。",
      },
    },
    {
      id: "sem",
      district: "4j",
      until: "2027-02-03",
      label: {
        en: "Second semester starts February 3. February 1 is a grading day; February 2 is transition planning.",
        zh: "下学期 2 月 3 日开始。2 月 1 日是登分日，2 月 2 日是过渡规划日。",
        es: "El segundo semestre empieza el 3 de febrero. El 1 de febrero es día de notas; el 2 es planificación de transición.",
        ko: "2학기는 2월 3일에 시작해요. 2월 1일은 성적 마감일, 2월 2일은 전환 준비일이에요.",
        vi: "Học kỳ hai bắt đầu ngày 3 tháng 2. Ngày 1 tháng 2 là ngày nhập điểm; ngày 2 là chuẩn bị chuyển học kỳ.",
        ja: "後期は2月3日に始まります。2月1日は成績確定日、2月2日は移行準備日です。",
      },
    },
    {
      id: "other",
      label: {
        en: "Cascade is Bethel. Shasta closed this fall and most of those students moved — trust the district letter over an old map.",
        zh: "Cascade 属于 Bethel 学区。Shasta 今年秋天停办，多数学生转走了。以学区来信为准，不要看旧地图。",
      },
    },
  ],
  high: [
    {
      id: "wed",
      district: "4j",
      label: {
        en: "Wednesday release is 2:30. A job or practice can start then only if the school actually allows it.",
        zh: "周三 2:30 放学。兼职或训练能不能接着开始，先问学校。",
      },
    },
    {
      id: "early",
      until: "2026-11-01",
      label: {
        en: "Seniors: November 1 is a common early-application date. Check each college.",
        zh: "高三：11 月 1 日是很多学校的提前申请日。一所一所核对。",
      },
    },
    {
      id: "aid",
      label: {
        en: "FAFSA and Oregon Student Aid are this fall’s paperwork, not a spring surprise.",
        zh: "FAFSA 和俄勒冈州助学金这个秋天就要填，别拖到春天。",
      },
    },
    {
      id: "grade",
      district: "4j",
      until: "2027-02-01",
      label: {
        en: "November 6 and February 1 are grading days. No school.",
        zh: "11 月 6 日和 2 月 1 日是登分日，不上课。",
        es: "El 6 de noviembre y el 1 de febrero son días de notas. No hay clases.",
        ko: "11월 6일과 2월 1일은 성적 마감일이에요. 수업이 없어요.",
        vi: "Ngày 6 tháng 11 và 1 tháng 2 là ngày nhập điểm. Không có lớp.",
        ja: "11月6日と2月1日は成績確定日です。授業はありません。",
      },
    },
    {
      id: "sem",
      district: "4j",
      until: "2027-02-03",
      label: {
        en: "Second semester starts February 3.",
        zh: "下学期 2 月 3 日开始。",
        es: "El segundo semestre empieza el 3 de febrero.",
        ko: "2학기는 2월 3일에 시작해요.",
        vi: "Học kỳ hai bắt đầu ngày 3 tháng 2.",
        ja: "後期は2月3日に始まります。",
      },
    },
    {
      id: "bus",
      label: {
        en: "A school bus and an LTD bus are different systems. Don’t assume the college student fare.",
        zh: "校车和 LTD 不是一套。不要默认大学生的票价。",
      },
    },
    {
      id: "ihs",
      district: "4j",
      label: {
        en: "Eugene International sits inside the four 4J high schools. Your building is still South, Sheldon, Churchill, or North.",
        zh: "Eugene International 在 4J 学区四所高中里面。你的楼还是 South、Sheldon、Churchill 或 North。",
      },
    },
    {
      id: "rain",
      label: {
        en: "A jacket. The bike still needs a light from October on.",
        zh: "一件外套。十月起自行车还要车灯。",
      },
    },
  ],
};

export const k12Links: { href: string; label: Copy; note: Copy }[] = [
  {
    href: "https://www.4j.lane.edu/calendars",
    label: { en: "4J calendars", zh: "4J 校历" },
    note: { en: "The PDF is the authority for days off.", zh: "哪天放假，以这份 PDF 为准。" },
  },
  {
    href: "https://www.4j.lane.edu/",
    label: { en: "Eugene School District 4J", zh: "尤金 4J 学区" },
    note: { en: "Most addresses in Eugene.", zh: "尤金大部分家庭住址在这个学区。" },
  },
  {
    href: "https://www.bethel.k12.or.us/",
    label: { en: "Bethel School District", zh: "Bethel 学区" },
    note: {
      en: "West Eugene, including Willamette and Kalapuya.",
      zh: "西尤金，包括 Willamette 和 Kalapuya。",
    },
  },
  {
    href: "https://www.springfield.k12.or.us/",
    label: { en: "Springfield schools", zh: "Springfield 学区" },
    note: {
      en: "Across the river. Their first week is not 4J’s.",
      zh: "在河对岸。他们开学那一周跟 4J 不是同一天。",
    },
  },
  {
    href: "https://studentaid.gov/",
    label: { en: "FAFSA", zh: "FAFSA" },
    note: {
      en: "Federal aid. Seniors, not freshmen.",
      zh: "联邦助学金。高三申请大学时才填，高一不用。",
    },
  },
  {
    href: "https://oregonstudentaid.gov/",
    label: { en: "Oregon Student Aid", zh: "俄勒冈州助学金" },
    note: {
      en: "The state grant sits next to the FAFSA, not inside it.",
      zh: "俄勒冈州的补助要另外申请，填完 FAFSA 不会自动有。",
    },
  },
];
