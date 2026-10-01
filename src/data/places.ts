import type { Level } from "@/lib/levels";
import type { Copy } from "@/lib/text";

export type AreaId =
  | "campus"
  | "west"
  | "downtown"
  | "whit"
  | "river"
  | "south"
  | "lcc";

export type PlaceCat = "study" | "dining" | "coffee" | "eat" | "out" | "errand";

export type Place = {
  id: string;
  page: "campus" | "town";
  cat: PlaceCat;
  area: AreaId;
  name: string;
  blurb: Copy;
  href?: string;
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
    href: "https://library.uoregon.edu/hours",
    blurb: {
      en: "The default. Learn which floor is actually quiet. Hours shift in finals week — check before you cross campus in the rain.",
      zh: "默认自习地。先摸清哪一层真的安静。期末开放时间会变，下雨跑过去之前先看官网。",
    },
  },
  {
    id: "price",
    page: "campus",
    cat: "study",
    area: "campus",
    name: "Price Science Commons",
    blurb: {
      en: "The science library. Better group rooms than Knight when everyone in your lab shows up at once.",
      zh: "理科图书馆。几个人一起讨论，这里比 Knight 好订房间。",
    },
  },
  {
    id: "fishbowl",
    page: "campus",
    cat: "study",
    area: "campus",
    name: "EMU Fishbowl",
    href: "https://emu.uoregon.edu/",
    blurb: {
      en: "Tables and outlets under the student union. Fine between classes. A bad place to write the paper you have been avoiding.",
      zh: "学生会楼下有桌子和插座。课间坐一会儿可以。长论文不适合在这里写。",
    },
  },
  {
    id: "lillis",
    page: "campus",
    cat: "study",
    area: "campus",
    name: "Lillis Hall",
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
    href: "https://jsma.uoregon.edu/",
    blurb: {
      en: "When another fluorescent room sounds unbearable. Ask at the desk — students are often admitted free.",
      zh: "不想再待在日光灯下面的时候来这里。门口问一下，学生常常不用买票。",
    },
  },
  {
    id: "quad",
    page: "campus",
    cat: "study",
    area: "campus",
    name: "Memorial Quad",
    blurb: {
      en: "Grass, not a power plan. Use it on the rare afternoon the sky is actually blue.",
      zh: "草坪上没有插座。等真出太阳再去。",
    },
  },
  {
    id: "lawlib",
    page: "campus",
    cat: "study",
    area: "campus",
    name: "Knight Law Library",
    blurb: {
      en: "Very quiet. If the law school is in exams, leave the seats to them.",
      zh: "这里很安静。法学院考试的时候，把位子让给他们。",
    },
  },
  {
    id: "lcclib",
    page: "campus",
    cat: "study",
    area: "lcc",
    name: "LCC Library",
    href: "https://www.lanecc.edu/",
    blurb: {
      en: "Main campus on East 30th. A real room when the UO libraries are full, and the home library if you go to Lane.",
      zh: "主校区在东 30 街。UO 图书馆坐满了可以来这里。如果你在莱恩社区学院读书，这就是你的图书馆。",
    },
  },
  {
    id: "emu-food",
    page: "campus",
    cat: "dining",
    area: "campus",
    name: "EMU food court",
    href: "https://emu.uoregon.edu/",
    blurb: {
      en: "Fast and central, mostly chains. Little Big Burger is the one that started in Portland rather than a national counter.",
      zh: "出餐快，在校园正中间，多数是连锁店。Little Big Burger 是波特兰起家的，不是全国连锁。",
    },
  },
  {
    id: "carson",
    page: "campus",
    cat: "dining",
    area: "campus",
    name: "Carson Dining",
    href: "https://housing.uoregon.edu/",
    blurb: {
      en: "Residence dining. Meal-plan territory, and weekend hours move — check housing before you walk over hungry.",
      zh: "宿舍食堂，要用餐卡。周末时间会变。别空着肚子走过去，先看住房网站。",
    },
  },
  {
    id: "hamilton",
    page: "campus",
    cat: "dining",
    area: "campus",
    name: "Hamilton Dining",
    href: "https://housing.uoregon.edu/",
    blurb: {
      en: "The other big dining room, on the west side of the quads. Same rule: trust this term's hours, not last year's memory.",
      zh: "另一间大餐厅，在大草坪西边。营业时间看这学期的，别靠去年的记忆。",
    },
  },
  {
    id: "agate",
    page: "campus",
    cat: "dining",
    area: "campus",
    name: "Agate Street Market",
    blurb: {
      en: "Inside Unthank Hall. Snacks and a few real groceries, so tonight does not have to be another campus pastry.",
      zh: "在 Unthank 楼里。有零食，也有一点能当饭的东西。今晚不必再吃一块校园点心。",
    },
  },
  {
    id: "roma",
    page: "town",
    cat: "coffee",
    area: "campus",
    name: "Espresso Roma",
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
    blurb: {
      en: "Booths and breakfast all day. The restaurant people mention once they have actually lived here.",
      zh: "有卡座，全天供应早餐。在尤金住过一阵的人，才会跟你提这家。",
    },
  },
  {
    id: "puckler",
    page: "town",
    cat: "eat",
    area: "west",
    name: "Prince Puckler's",
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
    blurb: {
      en: "Inside 5th Street Public Market. A nicer dinner, ideally when someone else is paying.",
      zh: "在第五街公共市场里面。比较正式的一顿，适合别人请客的时候去。",
    },
  },
  {
    id: "provisions",
    page: "town",
    cat: "eat",
    area: "downtown",
    name: "Provisions Market Hall",
    blurb: {
      en: "Same building as Marché, more stalls, easier to split a meal without dressing up.",
      zh: "和 Marché 同一栋楼，摊位更多。不用穿正式，几个人分着吃也方便。",
    },
  },
  {
    id: "pres",
    page: "town",
    cat: "out",
    area: "river",
    name: "Pre's Trail",
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
    blurb: {
      en: "Indoors, which matters from October on. Food, a few shops, and a place to wait out a squall.",
      zh: "在室内。从十月开始这很重要。有吃的、几家店，下雨也能躲一会儿。",
    },
  },
  {
    id: "duckstore",
    page: "town",
    cat: "errand",
    area: "campus",
    name: "Duck Store",
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
    blurb: {
      en: "Agate Street Market covers tonight. Fred Meyer or Market of Choice is the actual shop. The Duck Store is not a grocery plan.",
      zh: "今晚临时要买的，可以去 Agate Street Market。正经买菜去 Fred Meyer 或 Market of Choice。Duck Store 不是超市。",
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
