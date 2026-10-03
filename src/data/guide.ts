import type { Copy } from "@/lib/text";

export type Bilingual = Copy;

export type Deadline = {
  id: string;
  ymd: string;
  time?: string;
  title: Bilingual;
  detail: Bilingual;
};

export const deadlines: Deadline[] = [
  {
    id: "waitlist",
    ymd: "2026-09-30",
    time: "09:00",
    title: { en: "Waitlisting ends", zh: "候补截止" },
    detail: {
      en: "Fall 2026 waitlists close at 9 a.m. After that you need an add, not a waitlist.",
      zh: "2026 秋季候补上午 9 点关闭。之后只能加课，不能再排候补。",
    },
  },
  {
    id: "drop",
    ymd: "2026-10-03",
    title: { en: "Drop with no W", zh: "退课不记 W" },
    detail: {
      en: "Last day to drop in DuckWeb with no W on the transcript. The registrar also posts refund rules for full withdrawals — read them there, not here.",
      zh: "在 DuckWeb 退课且成绩单不记 W 的截止日期。如需退掉本学期全部课程，请到教务处网站确认退款规定。",
    },
  },
  {
    id: "add",
    ymd: "2026-10-05",
    title: { en: "Last day to add", zh: "加课截止" },
    detail: {
      en: "Last day to register or add fall classes in MyUO.",
      zh: "在 MyUO 注册或加秋季课的最后一天。",
    },
  },
  {
    id: "veterans",
    ymd: "2026-11-11",
    title: { en: "Veterans Day", zh: "退伍军人节" },
    detail: { en: "No classes.", zh: "停课。" },
  },
  {
    id: "winterreg",
    ymd: "2026-11-16",
    title: { en: "Winter registration opens", zh: "冬季选课开始" },
    detail: {
      en: "Initial winter 2027 registration runs November 16–25, per the catalog.",
      zh: "按校历，2027 冬季学期初次选课是 11 月 16 日至 25 日。",
    },
  },
  {
    id: "thanks",
    ymd: "2026-11-26",
    title: { en: "Thanksgiving break", zh: "感恩节假期" },
    detail: {
      en: "November 26–27. Campus goes quiet. The town does not fully close, and the bus might.",
      zh: "11 月 26 日和 27 日停课。校园很安静。城里的店不会全关，但公交可能会少开几班。",
    },
  },
  {
    id: "finals",
    ymd: "2026-12-07",
    title: { en: "Finals begin", zh: "期末开始" },
    detail: {
      en: "Exams run December 7–11. The exam clock often does not match the lecture. Check DuckWeb.",
      zh: "考试从 12 月 7 日到 11 日。考试时间经常和上课时间不一样，去 DuckWeb 核对。",
    },
  },
  {
    id: "finalsend",
    ymd: "2026-12-11",
    title: { en: "Finals end", zh: "期末结束" },
    detail: {
      en: "Winter break runs through January 3.",
      zh: "之后放假到 1 月 3 日。",
    },
  },
];

export const checklist: { id: string; label: Bilingual }[] = [
  {
    id: "schedule",
    label: {
      en: "Open your schedule and mark anything you might drop. No-W day is October 3.",
      zh: "打开课表，标出可能要退的课。不记 W 的截止日期是 10 月 3 日。",
    },
  },
  {
    id: "add",
    label: {
      en: "If a class is still wrong, add or swap before October 5.",
      zh: "课还不对的话，10 月 5 日前加完或换完。",
    },
  },
  {
    id: "knight",
    label: {
      en: "Walk Knight Library once and find the floor you can actually work on.",
      zh: "去一次 Knight，找到你真能坐住的那一层。",
    },
  },
  {
    id: "bus",
    label: {
      en: "Ride EmX downtown and back once, before you need it in the dark.",
      zh: "先坐一次 EmX 去市中心再回来。别等到天黑下雨才第一次坐。",
    },
  },
  {
    id: "rain",
    label: {
      en: "Put a jacket by the door. October is when Eugene starts meaning it.",
      zh: "门边放一件外套。十月起，尤金的雨是真下的。",
    },
  },
  {
    id: "food",
    label: {
      en: "Find one grocery that is not a convenience markup.",
      zh: "找一家真正的超市，别只在便利店买菜。",
    },
  },
  {
    id: "id",
    label: {
      en: "Carry the student ID. It is the library card, and for UO students it has long been the bus pass.",
      zh: "随身带学生证。借书用它。UO 学生坐公交也一直用它。",
    },
  },
  {
    id: "mail",
    label: {
      en: "Read the UO email. Canvas and Duo will not reach you on WeChat.",
      zh: "看学校邮箱。Canvas 和 Duo 不会发到微信上。",
    },
  },
];

export const schools: {
  name: string;
  href: string;
  body: Bilingual;
}[] = [
  {
    name: "University of Oregon",
    href: "https://www.uoregon.edu/",
    body: {
      en: "Term calendar, not semesters. Fall 2026 classes began September 28. The law school is the exception: it runs semesters and started August 24. These deadlines are for the rest of campus.",
      zh: "本科一年四个学期，不是两个。2026 年秋季 9 月 28 日开学。法学院不一样，一年两个学期，8 月 24 日已经上课。下面的日期不包括法学院。",
    },
  },
  {
    name: "Lane Community College",
    href: "https://www.lanecc.edu/",
    body: {
      en: "Main campus at 4000 East 30th Avenue, a bus ride south. LCC does not share the UO calendar. Do not assume a UO Monday off is your Monday off.",
      zh: "主校区在东 30 街 4000 号，往南坐公交就到。莱恩社区学院和 UO 不是同一份校历。UO 周一停课，不代表你也停。",
    },
  },
];

export const around: { title: Bilingual; body: Bilingual }[] = [
  {
    title: { en: "EmX, not a car", zh: "先坐 EmX，别先买车" },
    body: {
      en: "LTD's EmX runs the Franklin corridor: campus, downtown Eugene Station, and on to Springfield. UO students have long boarded with a student ID, paid through fees. Confirm this term on ltd.org before you argue with a farebox.",
      zh: "LTD 的 EmX 沿 Franklin 走：校园、市中心 Eugene Station，再到 Springfield。UO 学生一直凭学生证上车，车费含在学杂费里。跟司机争票价之前，先到 ltd.org 看这学期还是不是这样。",
    },
  },
  {
    title: { en: "Bike, then lock it", zh: "骑车，然后锁好" },
    body: {
      en: "Campus is flat until the south hills. From October, lights are not optional. West University theft is ordinary — lock the frame to a rack, not a wheel to itself.",
      zh: "到南山之前，这一带是平的。十月起晚上骑车必须开车灯。西区经常丢车：把车架锁在停车架上，不要只锁一个轮子。",
    },
  },
  {
    title: { en: "The wet months", zh: "下雨的几个月" },
    body: {
      en: "October through May is the season. A shell and shoes you can soak beat another hoodie. Knight is the indoor plan B.",
      zh: "十月到五月是雨季。一件雨衣和不怕湿的鞋，比再买一件卫衣有用。下雨就去 Knight 图书馆。",
    },
  },
];

export const neighborhoods: { name: string; zh: string; body: Bilingual }[] = [
  {
    name: "West University",
    zh: "校园西区",
    body: {
      en: "Dense blocks between campus and Willamette, north of about 18th. Most first apartments. Loud on weekends. You can walk to class.",
      zh: "校园和 Willamette 之间、大约 18 街以北，房子很密。很多人的第一套公寓。周末吵。可以走到教室。",
    },
  },
  {
    name: "South University",
    zh: "校园南边",
    body: {
      en: "South of 18th toward 24th. Still bikeable, a little quieter, more houses than porches.",
      zh: "从 18 街往南到 24 街。还能骑车去学校，也安静一点。公寓少，独栋房子多。",
    },
  },
  {
    name: "Fairmount",
    zh: "校园东边",
    body: {
      en: "East toward the river and Hendricks. Leafy, a longer walk, the choice if you hate the West U weekend.",
      zh: "往东，靠近河边和 Hendricks。树多，走路更远。不想过西区那种吵的周末，可以住这边。",
    },
  },
  {
    name: "Downtown",
    zh: "市中心",
    body: {
      en: "Saturday Market, the bus station, 5th Street. A short EmX hop. Not where most students sleep.",
      zh: "这里有周六市集、公交站和第五街。坐 EmX 很快到。多数学生不住在这里。",
    },
  },
  {
    name: "Whiteaker",
    zh: "Whiteaker",
    body: {
      en: "West of downtown. Food and older houses. The neighborhood for people who live in Eugene, not only at the UO.",
      zh: "市中心西边。吃的多，老房子多。住这边的人是在尤金生活，不只是在校园边上住。",
    },
  },
  {
    name: "South hills",
    zh: "南山",
    body: {
      en: "Past Amazon Park and up. Pretty, steep, and you will live in the bus app.",
      zh: "过了 Amazon 公园再往上。风景好，坡很陡。上下学基本得看公交软件。",
    },
  },
  {
    name: "Springfield",
    zh: "斯普林菲尔德",
    body: {
      en: "Across the river, often cheaper. The EmX is the whole point. Time a commute before you sign.",
      zh: "河对岸通常更便宜。通勤靠 EmX。签约前先自己坐一次，看看要多久。",
    },
  },
];

export const arrival: Bilingual = {
  en: "Eugene is not a big-city Chinatown. Asian groceries are small; a lot of students do a monthly run toward Beaverton's 99 Ranch, or just cook from Fred Meyer. Campus will email you. Off-campus work is a visa question — ISSS answers it, a group chat does not. Get a U.S. number in week one if you do not have one. Duo and housing mail assume it.",
  zh: "尤金没有大城市那种唐人街。亚洲超市很小。不少人一个月去一次比弗顿的 99 Ranch，或者就在 Fred Meyer 买菜做饭。学校用邮件联系你，不是微信。校外打工能不能做，问 ISSS，别问群聊。第一周办一个美国手机号。Duo 和宿舍通知都默认你有这个号码。",
};

export const helpLinks: { href: string; label: Bilingual; note: Bilingual }[] = [
  {
    href: "https://registrar.uoregon.edu/",
    label: { en: "Registrar", zh: "教务处" },
    note: { en: "Dates, deadlines, transcripts.", zh: "日期、截止日期、成绩单。" },
  },
  {
    href: "https://duckweb.uoregon.edu/",
    label: { en: "DuckWeb", zh: "DuckWeb" },
    note: { en: "The records portal students still call by this name.", zh: "学生现在还叫它 DuckWeb。" },
  },
  {
    href: "https://catalog.uoregon.edu/calendar/",
    label: { en: "Catalog calendar", zh: "校历" },
    note: { en: "Fall 2026 and the terms after it.", zh: "2026 秋季，以及后面几个学期。" },
  },
  {
    href: "https://map.uoregon.edu/",
    label: { en: "Campus map", zh: "校园地图" },
    note: { en: "Building names are not intuitive. PLC is a real place.", zh: "楼的名字不好猜。PLC 是一栋真的教学楼。" },
  },
  {
    href: "https://library.uoregon.edu/hours",
    label: { en: "Library hours", zh: "图书馆时间" },
    note: { en: "Today, not a rumor from fall of last year.", zh: "看今天的开放时间，别用去年秋天的说法。" },
  },
  {
    href: "https://www.ltd.org/",
    label: { en: "LTD buses", zh: "LTD 公交" },
    note: { en: "EmX and the rest of the city.", zh: "EmX 和城里其他线。" },
  },
  {
    href: "https://isss.uoregon.edu/",
    label: { en: "ISSS", zh: "国际学生事务" },
    note: { en: "Visas, work rules, arrival paperwork.", zh: "签证、打工规定、入学手续。" },
  },
  {
    href: "https://financialaid.uoregon.edu/",
    label: { en: "Financial aid", zh: "助学金办公室" },
    note: { en: "Bills and aid, not a group-chat answer.", zh: "学费和助学金以这里为准，别信群聊。" },
  },
  {
    href: "https://health.uoregon.edu/",
    label: { en: "University Health Services", zh: "校医院" },
    note: { en: "The campus clinic.", zh: "校园诊所。" },
  },
  {
    href: "https://counseling.uoregon.edu/",
    label: { en: "Counseling", zh: "心理咨询" },
    note: {
      en: "Same-day urgent options exist. If someone is in danger, call 911.",
      zh: "有当天的紧急咨询。有人处于危险中就打 911。",
    },
  },
  {
    href: "https://www.lanecc.edu/",
    label: { en: "Lane Community College", zh: "莱恩社区学院" },
    note: { en: "Separate calendar, separate records.", zh: "校历和成绩系统都跟 UO 分开。" },
  },
  {
    href: "https://eugenesaturdaymarket.org/",
    label: { en: "Saturday Market", zh: "周六市集" },
    note: { en: "Whether this week's market is actually on.", zh: "先确认这周市集开不开。" },
  },
];
