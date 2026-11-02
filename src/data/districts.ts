import type { Copy } from "@/lib/text";

export type DistrictId =
  | "4j"
  | "bethel"
  | "springfield"
  | "creswell"
  | "crow"
  | "fern"
  | "harrisburg"
  | "junction"
  | "lowell"
  | "marcola"
  | "monroe"
  | "pleasant"
  | "southlane"
  | "sweethome";

export type District = {
  id: DistrictId;
  en: string;
  zh: string;
  href: string | null;
};

export const DISTRICTS: District[] = [
  {
    id: "4j",
    en: "Eugene 4J",
    zh: "尤金 4J 学区",
    href: "https://www.4j.lane.edu/",
  },
  {
    id: "bethel",
    en: "Bethel",
    zh: "Bethel 学区",
    href: "https://www.bethel.k12.or.us/",
  },
  {
    id: "springfield",
    en: "Springfield",
    zh: "Springfield 学区",
    href: "https://www.springfield.k12.or.us/",
  },
  {
    id: "creswell",
    en: "Creswell",
    zh: "Creswell 学区",
    href: null,
  },
  {
    id: "crow",
    en: "Crow-Applegate-Lorane",
    zh: "Crow-Applegate-Lorane 学区",
    href: null,
  },
  {
    id: "fern",
    en: "Fern Ridge",
    zh: "Fern Ridge 学区",
    href: null,
  },
  {
    id: "harrisburg",
    en: "Harrisburg",
    zh: "Harrisburg 学区",
    href: null,
  },
  {
    id: "junction",
    en: "Junction City",
    zh: "Junction City 学区",
    href: null,
  },
  {
    id: "lowell",
    en: "Lowell",
    zh: "Lowell 学区",
    href: null,
  },
  {
    id: "marcola",
    en: "Marcola",
    zh: "Marcola 学区",
    href: null,
  },
  {
    id: "monroe",
    en: "Monroe",
    zh: "Monroe 学区",
    href: null,
  },
  {
    id: "pleasant",
    en: "Pleasant Hill",
    zh: "Pleasant Hill 学区",
    href: null,
  },
  {
    id: "southlane",
    en: "South Lane",
    zh: "South Lane 学区",
    href: null,
  },
  {
    id: "sweethome",
    en: "Sweet Home",
    zh: "Sweet Home 学区",
    href: null,
  },
];

const IDS = new Set(DISTRICTS.map((item) => item.id));

export function isDistrict(value: unknown): value is DistrictId {
  return typeof value === "string" && IDS.has(value as DistrictId);
}

export function districtById(id: DistrictId): District {
  const found = DISTRICTS.find((item) => item.id === id);
  if (!found) throw new Error("district");
  return found;
}

export function districtCopy(id: DistrictId): Copy {
  const item = districtById(id);
  return { en: item.en, zh: item.zh };
}
