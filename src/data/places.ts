import type { Level } from "@/lib/levels";
import type { Copy } from "@/lib/text";

export type AreaId = "campus" | "west" | "downtown" | "whit" | "river" | "south" | "lcc";

export type PlaceCat = "study" | "dining" | "coffee" | "eat" | "out" | "errand";

export type Place = {
  id: string;
  page: "campus" | "town";
  cat: PlaceCat;
  area: AreaId;
  name: string;
  blurb: Copy;
  href?: string;
  /** Human hours hint — not a live feed; verify before you go. */
  hours?: string;
};

export const areaName: Record<AreaId, Copy> = {
  campus: { en: "Campus", zh: "校园" },
  west: { en: "West University", zh: "校园西区" },
  downtown: { en: "Downtown", zh: "市中心" },
  whit: { en: "Whiteaker", zh: "Whiteaker" },
  river: { en: "By the river", zh: "河边" },
  south: { en: "South hills", zh: "南山" },
  lcc: { en: "Lane Community College", zh: "莱恩社区学院" },
};

export const places: Place[] = [
  {
    id: "knight",
    page: "campus",
    cat: "study",
    area: "campus",
    name: "Knight Library",
    hours: "Varies · check library hours (finals shift)",
    href: "https://library.uoregon.edu/hours",
    blurb: {
      en: "The default. Learn which floor is actually quiet. Hours shift in finals week — check before you cross campus in the rain.",
      zh: "校园自习的常用选择，可按需要寻找安静楼层。期末和假期开放时间可能调整，出发前请查看官网。",
    },
  },
  {
    id: "price",
    page: "campus",
    cat: "study",
    area: "campus",
    name: "Price Science Commons",
    hours: "Weekdays daytime · quieter evenings than Knight",
    blurb: {
      en: "The science library. Better group rooms than Knight when everyone in your lab shows up at once.",
      zh: "理科图书馆，适合查阅资料或小组学习。讨论室的预约方式和空位请查看官网。",
    },
  },
  {
    id: "fishbowl",
    page: "campus",
    cat: "study",
    area: "campus",
    name: "EMU Fishbowl",
    hours: "EMU open hours · late on weeknights in term",
    href: "https://emu.uoregon.edu/",
    blurb: {
      en: "Tables and outlets under the student union. Fine between classes. A bad place to write the paper you have been avoiding.",
      zh: "学生会大楼内有桌椅和插座，适合课间休息或处理简单作业。需要专注时，可以再找一处安静空间。",
    },
  },
  {
    id: "lillis",
    page: "campus",
    cat: "study",
    area: "campus",
    name: "Lillis Hall",
    hours: "Building hours · atrium open most weekdays",
    blurb: {
      en: "Business-school atrium. Open, bright, and usually an outlet within reach.",
      zh: "商学院中庭。敞亮，插座一般够用。",
    },
  },
  {
    id: "jsma",
    page: "campus",
    cat: "study",
    area: "campus",
    name: "Jordan Schnitzer Museum of Art",
    hours: "Tue–Sun · often free for students",
    href: "https://jsma.uoregon.edu/",
    blurb: {
      en: "When another fluorescent room sounds unbearable. Ask at the desk — students are often admitted free.",
      zh: "课余可以来看看展览、换个心情。学生票价和入馆政策请查看官网。",
    },
  },
  {
    id: "quad",
    page: "campus",
    cat: "study",
    area: "campus",
    name: "Memorial Quad",
    hours: "Daylight · weather permitting",
    blurb: {
      en: "Grass, not a power plan. Use it on the rare afternoon the sky is actually blue.",
      zh: "天气好时可以在草坪上休息、看书。这里是户外空间，没有充电插座。",
    },
  },
  {
    id: "lawlib",
    page: "campus",
    cat: "study",
    area: "campus",
    name: "Knight Law Library",
    hours: "Law school hours · quietest midweek",
    blurb: {
      en: "Very quiet. If the law school is in exams, leave the seats to them.",
      zh: "适合安静阅读和学习。考试期间的访客规定及开放时间请以图书馆公告为准。",
    },
  },
  {
    id: "lcclib",
    page: "campus",
    cat: "study",
    area: "lcc",
    name: "LCC Library",
    hours: "See Lane calendar · closed some Fridays in summer",
    href: "https://www.lanecc.edu/",
    blurb: {
      en: "Main campus on East 30th. A real room when the UO libraries are full, and the home library if you go to Lane.",
      zh: "位于莱恩社区学院主校区，是莱恩学生查资料、自习和使用学习资源的主要场所。",
    },
  },
  {
    id: "emu-food",
    page: "campus",
    cat: "dining",
    area: "campus",
    name: "EMU food court",
    hours: "Lunch through dinner · weekends shorter",
    href: "https://emu.uoregon.edu/",
    blurb: {
      en: "Fast and central, mostly chains. Little Big Burger is the one that started in Portland rather than a national counter.",
      zh: "校园中心的餐饮区域，集合了多家店铺，适合课间快速用餐。",
    },
  },
  {
    id: "carson",
    page: "campus",
    cat: "dining",
    area: "campus",
    name: "Carson Dining",
    hours: "Meal-plan hours · weekends move",
    href: "https://housing.uoregon.edu/",
    blurb: {
      en: "Residence dining. Meal-plan territory, and weekend hours move — check housing before you walk over hungry.",
      zh: "宿舍餐饮场所。用餐方案、支付方式和周末营业时间请查看学校住房与餐饮网站。",
    },
  },
  {
    id: "hamilton",
    page: "campus",
    cat: "dining",
    area: "campus",
    name: "Hamilton Dining",
    hours: "Meal-plan hours · check housing",
    href: "https://housing.uoregon.edu/",
    blurb: {
      en: "The other big dining room, on the west side of the quads. Same rule: trust this term's hours, not last year's memory.",
      zh: "校园内的餐饮场所，适合上课前后用餐。营业时间可能随学期调整，请查看最新安排。",
    },
  },
  {
    id: "agate",
    page: "campus",
    cat: "dining",
    area: "campus",
    name: "Agate Street Market",
    hours: "Evenings in Unthank · limited groceries",
    blurb: {
      en: "Inside Unthank Hall. Snacks and a few real groceries, so tonight does not have to be another campus pastry.",
      zh: "位于 Unthank 楼内，有零食和简餐，适合课间补充能量。",
    },
  },
  {
    id: "roma",
    page: "town",
    cat: "coffee",
    area: "campus",
    name: "Espresso Roma",
    hours: "Morning through evening · 13th Ave",
    blurb: {
      en: "The 13th Avenue campus coffee shop. Hazelnut mocha is the cliché because people keep ordering it.",
      zh: "13 街上的校园咖啡馆。很多人点榛果摩卡。",
    },
  },
  {
    id: "vero",
    page: "town",
    cat: "coffee",
    area: "west",
    name: "Vero Espresso House",
    hours: "Weekday cafe hours · laptop-friendly",
    blurb: {
      en: "205 East 14th. About fifteen minutes off Knight. Laptops are normal; the library crush is not.",
      zh: "东 14 街 205 号，离 Knight 大约走一刻钟。可以打开电脑坐着，没有图书馆那么挤。",
    },
  },
  {
    id: "noisette",
    page: "town",
    cat: "coffee",
    area: "downtown",
    name: "Noisette",
    hours: "Morning pastry · closes mid-afternoon",
    blurb: {
      en: "Pastry on Broadway. A slow morning, not a four-hour bunker.",
      zh: "百老汇街上的面包店。适合慢慢吃早饭，不适合坐四个小时写作业。",
    },
  },
  {
    id: "fullcity",
    page: "town",
    cat: "coffee",
    area: "downtown",
    name: "Full City Coffee",
    hours: "Cafe hours · downtown pour",
    blurb: {
      en: "A Eugene roaster, not a national chain. Drink it where they pour it.",
      zh: "尤金本地烘焙的咖啡，不是全国连锁。建议在店里喝。",
    },
  },
  {
    id: "tacovore",
    page: "town",
    cat: "eat",
    area: "whit",
    name: "Tacovore",
    hours: "Lunch & dinner · Whiteaker",
    blurb: {
      en: "Whiteaker tacos. The neighborhood that feels like Eugene rather than just campus.",
      zh: "Whiteaker 的塔可。这边更像尤金这座城，不只是校园。",
    },
  },
  {
    id: "yumm",
    page: "town",
    cat: "eat",
    area: "campus",
    name: "Café Yumm!",
    hours: "Lunch through early evening",
    blurb: {
      en: "Rice bowls, born in Eugene. The place you take a visitor when you do not want to explain the menu.",
      zh: "米饭碗，这家店从尤金做起来的。带朋友来就行，菜单很好懂。",
    },
  },
  {
    id: "waffle",
    page: "town",
    cat: "eat",
    area: "west",
    name: "Off the Waffle",
    hours: "Brunch stretch · Sunday wait",
    blurb: {
      en: "Liège waffles as a study reward. Sundays mean a wait. Budget for that, not a reservation fantasy.",
      zh: "自习结束后可以来吃列日华夫。周日要排队，不能订位。",
    },
  },
  {
    id: "glenwood",
    page: "town",
    cat: "eat",
    area: "downtown",
    name: "The Glenwood",
    hours: "Breakfast all day · booth hours",
    blurb: {
      en: "Booths and breakfast all day. The restaurant people mention once they have actually lived here.",
      zh: "有卡座的本地餐厅，以全天早餐为特色，适合和朋友悠闲地吃一餐。",
    },
  },
  {
    id: "puckler",
    page: "town",
    cat: "eat",
    area: "west",
    name: "Prince Puckler's",
    hours: "Afternoon & evening scoops",
    blurb: {
      en: "Ice cream on 13th. Not dinner. Still part of being a student here.",
      zh: "13 街上的冰淇淋。不是正餐，不过学生经常去。",
    },
  },
  {
    id: "market-food",
    page: "town",
    cat: "eat",
    area: "downtown",
    name: "Saturday Market carts",
    hours: "Saturdays in season · ~10–4",
    href: "https://eugenesaturdaymarket.org/",
    blurb: {
      en: "Park Blocks, Saturdays in season, about 10 to 4. The Jamaican cart is the one people text you about.",
      zh: "市集开的季节，周六在 Park Blocks，大约 10 点到 4 点。很多人会专门跟你说，去那个牙买加餐车。",
    },
  },
  {
    id: "marche",
    page: "town",
    cat: "eat",
    area: "downtown",
    name: "Marché",
    hours: "Dinner · reservations help",
    blurb: {
      en: "Inside 5th Street Public Market. A nicer dinner, ideally when someone else is paying.",
      zh: "位于第五街公共市场，适合聚餐或想认真享用一顿饭的时候。菜单与价格请查看官网。",
    },
  },
  {
    id: "provisions",
    page: "town",
    cat: "eat",
    area: "downtown",
    name: "Provisions Market Hall",
    hours: "Daytime stalls · same building as Marché",
    blurb: {
      en: "Same building as Marché, more stalls, easier to split a meal without dressing up.",
      zh: "集合了不同餐饮摊位，适合和朋友各选喜欢的食物，再一起用餐。",
    },
  },
  {
    id: "pres",
    page: "town",
    cat: "out",
    area: "river",
    name: "Pre's Trail",
    hours: "Dawn to dusk · lights help after dark",
    blurb: {
      en: "Alton Baker Park, across the river. Flat, famous, and full of people running in weather you would call a reason to stay in.",
      zh: "河对岸的 Alton Baker 公园。地很平，人也多。天气很差的时候，这里还是有人在跑步。",
    },
  },
  {
    id: "spencer",
    page: "town",
    cat: "out",
    area: "south",
    name: "Spencer Butte",
    hours: "Daylight hike · ~1 hr up",
    blurb: {
      en: "The south hill. About an hour up if you do not rush. On a clear hour you can see the whole town.",
      zh: "南边的山。不赶路的话，大约一小时到顶。云散开时能看见整座城。",
    },
  },
  {
    id: "skinner",
    page: "town",
    cat: "out",
    area: "downtown",
    name: "Skinner Butte",
    hours: "Short climb · sunset worth it",
    blurb: {
      en: "A short climb over downtown. Come for the light, not for a workout.",
      zh: "市中心旁边的一座小山。来看风景就行，不必当成锻炼。",
    },
  },
  {
    id: "riverpath",
    page: "town",
    cat: "out",
    area: "river",
    name: "Ruth Bascom Riverbank Path",
    hours: "All day · lights after dusk",
    blurb: {
      en: "The bike highway along the Willamette. Use lights after dusk. This is how a lot of campus reaches Alton Baker.",
      zh: "沿着威拉米特河的自行车道。天黑后要开车灯。很多人从校园去 Alton Baker 走这条路。",
    },
  },
  {
    id: "hendricks",
    page: "town",
    cat: "out",
    area: "south",
    name: "Hendricks Park",
    hours: "Park hours · rhododendrons in spring",
    blurb: {
      en: "Rhododendrons in spring, a quiet forest the rest of the year. East of campus, up the hill.",
      zh: "春天有杜鹃花，其他季节是安静的林子。在校园东边的山上。",
    },
  },
  {
    id: "satmarket",
    page: "town",
    cat: "errand",
    area: "downtown",
    name: "Eugene Saturday Market",
    hours: "Sat in season · ~Apr–Nov, 10–4",
    href: "https://eugenesaturdaymarket.org/",
    blurb: {
      en: "Handmade goods, produce, and food on the Park Blocks. Free to walk. Regular season runs roughly April through November.",
      zh: "Park Blocks 上卖手作、蔬菜水果和吃的。进去不用买票。一般从四月开到十一月。",
    },
  },
  {
    id: "fifth",
    page: "town",
    cat: "errand",
    area: "downtown",
    name: "5th Street Public Market",
    hours: "Indoor · useful Oct–May",
    blurb: {
      en: "Indoors, which matters from October on. Food, a few shops, and a place to wait out a squall.",
      zh: "室内集市，有餐饮和小店，下雨天也可以慢慢逛。",
    },
  },
  {
    id: "duckstore",
    page: "town",
    cat: "errand",
    area: "campus",
    name: "Duck Store",
    hours: "Retail hours · textbook rush weeks",
    href: "https://www.uoduckstore.com/",
    blurb: {
      en: "Textbooks, and the sweatshirt you said you would not buy. Compare the ISBN before you pay campus prices.",
      zh: "卖教材，也卖卫衣。付钱前先核对 ISBN，别买错版本。",
    },
  },
  {
    id: "eugene-station",
    page: "town",
    cat: "errand",
    area: "downtown",
    name: "Eugene Station",
    hours: "LTD hub · EmX all day",
    href: "https://www.ltd.org/",
    blurb: {
      en: "The downtown LTD hub. EmX along Franklin is the student line: campus, downtown, Springfield.",
      zh: "市中心的 LTD 公交站。沿着富兰克林大街的 EmX 是学生常坐的线：校园、市中心、斯普林菲尔德。",
    },
  },
  {
    id: "grocery",
    page: "town",
    cat: "errand",
    area: "west",
    name: "A real grocery",
    hours: "Supermarket hours · not campus snack",
    blurb: {
      en: "Agate Street Market covers tonight. Fred Meyer or Market of Choice is the actual shop. The Duck Store is not a grocery plan.",
      zh: "临时补充日用品可考虑 Agate Street Market；购买较多食材可查看 Fred Meyer 或 Market of Choice。",
    },
  },
];

const ALL: Level[] = ["elem", "mid", "high", "uni"];

const AUDIENCE: Record<string, Level[]> = {
  pres: ALL,
  spencer: ALL,
  skinner: ALL,
  riverpath: ALL,
  hendricks: ALL,
  satmarket: ALL,
  "market-food": ALL,
  fifth: ALL,
  grocery: ALL,
  glenwood: ALL,
  puckler: ALL,
  yumm: ["mid", "high", "uni"],
  waffle: ["mid", "high", "uni"],
  tacovore: ["high", "uni"],
  marche: ["high", "uni"],
  provisions: ["high", "uni"],
  roma: ["high", "uni"],
  vero: ["high", "uni"],
  noisette: ["high", "uni"],
  fullcity: ["high", "uni"],
  "eugene-station": ["high", "uni"],
};

export function forLevel(place: Place, level: Level): boolean {
  return (AUDIENCE[place.id] ?? ["uni"]).includes(level);
}
