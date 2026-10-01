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

export const middleSchools = [
  "Roosevelt",
  "Spencer Butte",
  "Madison",
  "Kelly",
  "Kennedy",
  "Cal Young",
  "Monroe",
  "Arts & Technology Academy",
  "Cascade (Bethel)",
];

export const highSchools = [
  "South Eugene",
  "Sheldon",
  "Churchill",
  "North Eugene",
  "Eugene International",
  "Willamette (Bethel)",
  "Kalapuya (Bethel)",
];

const sharedDates: Deadline[] = [
  {
    id: "k-veterans",
    ymd: "2026-11-11",
    title: { en: "Veterans Day", zh: "退伍军人节" },
    detail: { en: "No school in 4J.", zh: "4J 停课。" },
  },
  {
    id: "k-conf",
    ymd: "2026-11-23",
    title: { en: "Conferences, then Thanksgiving", zh: "家长会，然后感恩节" },
    detail: {
      en: "4J is out November 23–27. Conference sign-up is per school.",
      zh: "4J 11 月 23 日至 27 日不上课。家长会预约看各校通知。",
    },
  },
  {
    id: "k-winter",
    ymd: "2026-12-21",
    title: { en: "Winter break", zh: "寒假" },
    detail: {
      en: "4J is out December 21 through January 4. Classes resume after the planning day.",
      zh: "4J 从 12 月 21 日放到 1 月 4 日。老师培训日过了才上课。",
    },
  },
  {
    id: "k-mlk",
    ymd: "2027-01-18",
    title: { en: "MLK Day", zh: "马丁·路德·金日" },
    detail: { en: "No school.", zh: "停课。" },
  },
  {
    id: "k-spring",
    ymd: "2027-03-22",
    title: { en: "Spring break", zh: "春假" },
    detail: {
      en: "4J lists March 22–29 with no school. Confirm the Monday back on the district PDF.",
      zh: "4J 写的是 3 月 22 日至 29 日不上课。哪天回来以学区 PDF 为准。",
    },
  },
  {
    id: "k-last",
    ymd: "2027-06-16",
    title: { en: "Last day, half day", zh: "最后一天，半天" },
    detail: {
      en: "4J’s last day is a Wednesday half day.",
      zh: "4J 最后一天是周三，只上半天。",
    },
  },
];

const secondaryDates: Deadline[] = [
  {
    id: "k-oct9",
    ymd: "2026-10-09",
    title: { en: "No school", zh: "停课" },
    detail: {
      en: "On the 4J middle and high calendar. Elementary may differ — check the PDF before you travel.",
      zh: "这是尤金 4J 学区里，初中和高中的校历。不是一所叫 4J 的学校。小学可能不是同一天。出门前先看学区 PDF。",
    },
  },
  {
    id: "k-midterm",
    ymd: "2026-11-06",
    title: { en: "Grading day", zh: "登分日，不上课" },
    detail: {
      en: "No school for 4J middle and high. A grading day, not a holiday you invent plans around until you confirm.",
      zh: "尤金 4J 学区的初中和高中这天不上课，老师在登成绩。确认了再拿它当休息日。",
    },
  },
  {
    id: "k-semester",
    ymd: "2027-01-29",
    title: { en: "Semester grading day", zh: "学期登分日，不上课" },
    detail: { en: "No school for 4J middle and high.", zh: "尤金 4J 学区的初中和高中不上课。" },
  },
  {
    id: "k-second",
    ymd: "2027-02-02",
    title: { en: "Second semester", zh: "下学期开始" },
    detail: {
      en: "4J middle and high start the second semester. February 1 is a transition day with no school.",
      zh: "尤金 4J 学区的初中和高中下学期开学。2 月 1 日是过渡日，不上课。",
    },
  },
];

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
  if (level === "mid" || level === "high") list.push(...secondaryDates);
  if (level === "high") list.push(seniorDate);
  return list.sort((a, b) => a.ymd.localeCompare(b.ymd));
}

export function releaseLine(level: Level, wednesday: boolean): Copy {
  const today = wednesday
    ? { en: "Today is the early release. ", zh: "今天提前放学。" }
    : { en: "", zh: "" };
  if (level === "elem") {
    return {
      en: `${today.en}Elementary Wednesdays end at 1:10 or 1:45, depending on the school.`,
      zh: `${today.zh}小学周三有的 1:10 放学，有的 1:45。以你自己学校的时间为准。`,
    };
  }
  if (level === "mid") {
    return {
      en: `${today.en}4J middle school lets out at 2:35 on Wednesdays. Regular days run 9:00–3:40.`,
      zh: `${today.zh}尤金 4J 学区的初中，周三 2:35 放学。平时是上午 9:00 到下午 3:40。`,
    };
  }
  return {
    en: `${today.en}4J high school lets out at 2:30 on Wednesdays. Regular days run 8:30–3:30.`,
    zh: `${today.zh}尤金 4J 学区的高中，周三 2:30 放学。平时是上午 8:30 到下午 3:30。`,
  };
}

export const k12Checks: Record<Exclude<Level, "uni">, { id: string; label: Copy }[]> = {
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
      label: {
        en: "Wednesday release is 2:35. Rides that assume 3:40 will be early.",
        zh: "周三 2:35 放学。还按 3:40 来接的人会早到。",
      },
    },
    {
      id: "grade",
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
      label: {
        en: "Second semester starts February 2. February 1 is a day off.",
        zh: "下学期 2 月 2 日开始。2 月 1 日不上课。",
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
      label: {
        en: "Wednesday release is 2:30. A job or practice can start then only if the school actually allows it.",
        zh: "周三 2:30 放学。兼职或训练能不能接着开始，先问学校。",
      },
    },
    {
      id: "early",
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
      label: {
        en: "November 6 and January 29 are grading days. No school.",
        zh: "11 月 6 日和 1 月 29 日是登分日，不上课。",
      },
    },
    {
      id: "sem",
      label: {
        en: "Second semester starts February 2.",
        zh: "下学期 2 月 2 日开始。",
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
    note: { en: "West Eugene, including Willamette and Kalapuya.", zh: "西尤金，包括 Willamette 和 Kalapuya。" },
  },
  {
    href: "https://www.springfield.k12.or.us/",
    label: { en: "Springfield schools", zh: "Springfield 学区" },
    note: { en: "Across the river. Their first week is not 4J’s.", zh: "在河对岸。他们开学那一周跟 4J 不是同一天。" },
  },
  {
    href: "https://studentaid.gov/",
    label: { en: "FAFSA", zh: "FAFSA" },
    note: { en: "Federal aid. Seniors, not freshmen.", zh: "联邦助学金。高三申请大学时才填，高一不用。" },
  },
  {
    href: "https://oregonstudentaid.gov/",
    label: { en: "Oregon Student Aid", zh: "俄勒冈州助学金" },
    note: { en: "The state grant sits next to the FAFSA, not inside it.", zh: "俄勒冈州的补助要另外申请，填完 FAFSA 不会自动有。" },
  },
];
