import { BookOpen, CalendarDays, GraduationCap, LibraryBig, MapPin } from "lucide-react";
import { eugeneClock, hmToMin } from "@/lib/time";

export type SeedTask = {
  id: string;
  titleEn: string;
  titleZh: string;
  detailEn: string;
  detailZh: string;
  type: "class" | "life" | "campus";
};

export const seedTasks: SeedTask[] = [
  {
    id: "seed-1",
    titleEn: "Read chapter 4",
    titleZh: "读第 4 章",
    detailEn: "ENG 101 · due today",
    detailZh: "ENG 101 · 今天交",
    type: "class",
  },
  {
    id: "seed-2",
    titleEn: "Pick up library hold",
    titleZh: "取图书馆预约书",
    detailEn: "Knight Library · before 6:00 PM",
    detailZh: "Knight 图书馆 · 下午 6 点前",
    type: "campus",
  },
  {
    id: "seed-3",
    titleEn: "Call home",
    titleZh: "给家里打个电话",
    detailEn: "A small thing that matters",
    detailZh: "小事，但很重要",
    type: "life",
  },
];

export const fallbackSchedule = [
  { time: "10:00", end: "10:50", titleEn: "Writing in the community", titleZh: "社区写作课", place: "PLC 180", color: "blue" },
  { time: "12:00", end: "13:00", titleEn: "Lunch + open studio", titleZh: "午饭 + 开放工作室", place: "Erb Memorial Union", color: "slate" },
  { time: "14:00", end: "15:15", titleEn: "Data & visual stories", titleZh: "数据与视觉叙事", place: "Allen Hall 206", color: "teal" },
];

export const announcements = [
  {
    titleEn: "Fall advising week opens Monday",
    titleZh: "秋季选课咨询周周一开始",
    detailEn: "Book a 20-minute slot before priority registration.",
    detailZh: "优先注册前预约 20 分钟咨询。",
  },
  {
    titleEn: "Knight Library late hours resume",
    titleZh: "Knight 图书馆恢复晚间开放",
    detailEn: "Sunday–Thursday until midnight for midterms.",
    detailZh: "为期中复习，周日到周四开到午夜。",
  },
];

export const quickLinks = [
  {
    titleEn: "Find a study spot",
    titleZh: "找自习点",
    detailEn: "Quiet rooms, coffee, late hours",
    detailZh: "安静教室、咖啡、晚间开放",
    href: "/town",
    icon: MapPin,
    accent: "blue",
  },
  {
    titleEn: "Plan your week",
    titleZh: "安排本周",
    detailEn: "Classes, errands, breathing room",
    detailZh: "课程、杂事、留一点空档",
    href: "/guide",
    icon: CalendarDays,
    accent: "teal",
  },
  {
    titleEn: "Check your GPA",
    titleZh: "看看绩点",
    detailEn: "A clear view of your progress",
    detailZh: "一眼看清学业进度",
    href: "/gpa",
    icon: GraduationCap,
    accent: "ink",
  },
];

export const typeLabel = {
  class: { en: "class", zh: "课程" },
  campus: { en: "campus", zh: "校园" },
  life: { en: "life", zh: "生活" },
  desk: { en: "note", zh: "笔记" },
} as const;

export function deadlinePassed(
  item: { ymd: string; time?: string },
  clock: ReturnType<typeof eugeneClock>,
) {
  if (item.ymd > clock.ymd) return false;
  if (item.ymd < clock.ymd) return true;
  if (!item.time) return false;
  return clock.minutes >= hmToMin(item.time);
}

export function minutesUntil(hm: string, clock: ReturnType<typeof eugeneClock>) {
  return hmToMin(hm) - clock.minutes;
}
