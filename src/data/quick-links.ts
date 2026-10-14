import type { Copy } from "../lib/text.ts";
import type { Level } from "../lib/levels.ts";
import type { DistrictId } from "./districts.ts";

export type QuickLink = { id: string; href: string; label: Copy };

// Official sites only; every URL was checked with curl on 2026-10-14.
const UNI: QuickLink[] = [
  { id: "canvas", href: "https://canvas.uoregon.edu/", label: { en: "Canvas", zh: "Canvas", es: "Canvas", ko: "Canvas", vi: "Canvas", ja: "Canvas" } },
  { id: "duckweb", href: "https://duckweb.uoregon.edu/", label: { en: "DuckWeb", zh: "DuckWeb", es: "DuckWeb", ko: "DuckWeb", vi: "DuckWeb", ja: "DuckWeb" } },
  {
    id: "knight-hours",
    // /hours (from the spec) is a 404; this is the library's own Knight hours page.
    href: "https://library.uoregon.edu/knight/knight-library-hours",
    label: { en: "Knight Library hours", zh: "Knight 图书馆时间", es: "Horario de Knight Library", ko: "Knight 도서관 운영 시간", vi: "Giờ mở cửa Knight Library", ja: "Knight 図書館の開館時間" },
  },
  { id: "uo-map", href: "https://map.uoregon.edu/", label: { en: "UO campus map", zh: "UO 校园地图", es: "Mapa del campus UO", ko: "UO 캠퍼스 지도", vi: "Bản đồ trường UO", ja: "UO キャンパスマップ" } },
  { id: "lcc", href: "https://www.lanecc.edu/", label: { en: "Lane CC", zh: "LCC 莱恩社区学院", es: "Lane CC", ko: "Lane CC", vi: "Lane CC", ja: "Lane CC" } },
  { id: "ltd", href: "https://www.ltd.org/", label: { en: "LTD buses", zh: "LTD 公交", es: "Buses de LTD", ko: "LTD 버스", vi: "Xe buýt LTD", ja: "LTD バス" } },
];

const FOURJ: QuickLink[] = [
  { id: "4j-calendar", href: "https://www.4j.lane.edu/calendars", label: { en: "4J calendars & bell times", zh: "4J 校历与作息", es: "Calendarios y horarios de 4J", ko: "4J 학사일정·시간표", vi: "Lịch và giờ học 4J", ja: "4J 学年暦と時程" } },
  { id: "4j", href: "https://www.4j.lane.edu/", label: { en: "Eugene 4J", zh: "4J 官网", es: "Eugene 4J", ko: "Eugene 4J", vi: "Eugene 4J", ja: "Eugene 4J" } },
];
const BETHEL: QuickLink = { id: "bethel", href: "https://www.bethel.k12.or.us/", label: { en: "Bethel", zh: "Bethel 官网", es: "Bethel", ko: "Bethel", vi: "Bethel", ja: "Bethel" } };
const SPRINGFIELD: QuickLink = { id: "springfield", href: "https://www.springfield.k12.or.us/", label: { en: "Springfield", zh: "Springfield 官网", es: "Springfield", ko: "Springfield", vi: "Springfield", ja: "Springfield" } };
const HIGH: QuickLink[] = [
  { id: "fafsa", href: "https://studentaid.gov/", label: { en: "FAFSA", zh: "FAFSA 联邦助学", es: "FAFSA", ko: "FAFSA", vi: "FAFSA", ja: "FAFSA" } },
  { id: "osac", href: "https://oregonstudentaid.gov/", label: { en: "Oregon Student Aid", zh: "俄勒冈州助学金", es: "Oregon Student Aid", ko: "Oregon Student Aid", vi: "Oregon Student Aid", ja: "Oregon Student Aid" } },
];

/** Quick links for the school level and (K–12) district in use. */
export function quickLinks(level: Level, district: DistrictId | null): QuickLink[] {
  if (level === "uni") return UNI;
  const local =
    district === null || district === "4j"
      ? FOURJ
      : district === "bethel"
        ? [BETHEL]
        : district === "springfield"
          ? [SPRINGFIELD]
          : [...FOURJ, BETHEL, SPRINGFIELD];
  return level === "high" ? [...local, ...HIGH] : local;
}

/** Every link, for search. */
export const ALL_QUICK_LINKS: QuickLink[] = [...UNI, ...FOURJ, BETHEL, SPRINGFIELD, ...HIGH];
