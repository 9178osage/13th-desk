import { CalendarDays, GraduationCap, MapPin } from "lucide-react";
import { eugeneClock, hmToMin } from "@/lib/time";

export const announcements = [
  {
    titleEn: "Check your school calendar",
    titleZh: "留意学校通知",
    detailEn: "Confirm registration dates and schedule changes with your school.",
    detailZh: "选课日期和课表变动以学校通知为准。",
  },
  {
    titleEn: "Check hours before visiting",
    titleZh: "出门前确认开放时间",
    detailEn: "Library and study-space hours may change during breaks.",
    detailZh: "图书馆和自习场所在假期可能调整开放时间。",
  },
];

export const quickLinks = [
  {
    titleEn: "Find a study spot",
    titleZh: "查找自习地点",
    detailEn: "Libraries, cafés and study spaces",
    detailZh: "图书馆、咖啡馆和学习空间",
    href: "/town",
    icon: MapPin,
    accent: "blue",
  },
  {
    titleEn: "Student guide",
    titleZh: "查看学生指南",
    detailEn: "School dates and useful resources",
    detailZh: "学校日程和常用资源",
    href: "/guide",
    icon: CalendarDays,
    accent: "teal",
  },
  {
    titleEn: "Check your GPA",
    titleZh: "计算绩点",
    detailEn: "A clear view of your progress",
    detailZh: "根据学分和成绩计算 GPA",
    href: "/gpa",
    icon: GraduationCap,
    accent: "ink",
  },
];

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
