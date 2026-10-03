import { useEffect, useMemo, useState } from "react";
import { deadlines as uniDeadlines } from "@/data/guide";
import { deadlinesFor, releaseLine } from "@/data/k12";
import { LEVELS } from "@/lib/levels";
import { useDesk, useLang, weekdayToScheduleDay } from "@/lib/store";
import { tf, tr } from "@/lib/text";
import {
  K12_EARLY,
  K12_END,
  K12_START,
  eugeneClock,
  hmToMin,
  spanPhase,
  termPhase,
} from "@/lib/time";
import {
  deadlinePassed,
  minutesUntil,
} from "@/components/home-dashboard-data";

export function useHomeDashboardModel() {
  const lang = useLang();
  const level = useDesk((state) => state.level);
  const earlyStart = useDesk((state) => state.earlyStart);
  const setEarlyStart = useDesk((state) => state.setEarlyStart);
  const district = useDesk((state) => state.district);
  const notes = useDesk((state) => state.buckets[state.level].notes);
  const scheduleBlocks = useDesk((state) => state.buckets[state.level].schedule);
  const addNote = useDesk((state) => state.addNote);
  const toggleNote = useDesk((state) => state.toggleNote);
  const removeNote = useDesk((state) => state.removeNote);

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 30_000);
    window.addEventListener("focus", update);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", update); };
  }, []);
  const clock = eugeneClock(now ?? new Date("2026-01-01T12:00:00Z"));
  const todayKey = weekdayToScheduleDay(clock.weekday);
  const levelName = LEVELS.find((item) => item.id === level);

  const phase =
    level === "uni"
      ? termPhase(clock.ymd)
      : spanPhase(clock.ymd, earlyStart ? K12_EARLY : K12_START, K12_END);

  const dateList = level === "uni" ? uniDeadlines : deadlinesFor(level);
  const upcoming = dateList.filter((item) => !deadlinePassed(item, clock)).slice(0, 3);

  const todayBlocks = useMemo(() => {
    if (!todayKey) return [];
    return scheduleBlocks
      .filter((item) => item.day === todayKey)
      .slice()
      .sort((a, b) => a.start.localeCompare(b.start));
  }, [scheduleBlocks, todayKey]);

  const nextBlock = useMemo(() => {
    const upcomingBlocks = todayBlocks.filter((item) => hmToMin(item.end) > clock.minutes);
    return upcomingBlocks[0] ?? null;
  }, [todayBlocks, clock.minutes]);

  const scheduleRows = useMemo(() => {
    if (todayBlocks.length > 0) {
      return todayBlocks.slice(0, 4).map((item, index) => ({
        time: item.start,
        end: item.end,
        titleEn: item.title,
        titleZh: item.title,
        place: item.place || "—",
        color: index === 0 ? "blue" : index === 1 ? "teal" : "slate",
      }));
    }
    return [];
  }, [todayBlocks]);

  const [mode, setMode] = useState<"today" | "week">("today");
  const [draft, setDraft] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [notice, setNotice] = useState<{ en: string; zh: string } | null>(null);

  const deskOpen = notes.filter((n) => !n.done).length;
  const deskDone = notes.filter((n) => n.done).length;
  const openCount = deskOpen;
  const completed = deskDone;

  const weekItems = useMemo(() => {
    const byDay = new Map<string, string[]>();
    for (const block of [...scheduleBlocks].sort((a, b) => a.start.localeCompare(b.start))) {
      const list = byDay.get(block.day) ?? [];
      list.push(block.title);
      byDay.set(block.day, list);
    }
    const order = ["mon", "tue", "wed", "thu", "fri"] as const;
    const labels = {
      mon: { en: "MON", zh: "一" },
      tue: { en: "TUE", zh: "二" },
      wed: { en: "WED", zh: "三" },
      thu: { en: "THU", zh: "四" },
      fri: { en: "FRI", zh: "五" },
    };
    const rows = order
      .filter((day) => byDay.has(day))
      .map((day) => ({
        day,
        label: labels[day],
        title: (byDay.get(day) ?? []).join(" · "),
      }));
    return rows;
  }, [scheduleBlocks]);

  let termLine = tr(lang, {
    en:
      level === "uni"
        ? "Fall term has finished. The registrar has the next calendar."
        : "The school year ended June 16. Next year’s dates are on the district site.",
    zh:
      level === "uni"
        ? "秋季学期结束了。下一份校历在教务处网站。"
        : "这学年 6 月 16 日结束了。明年的日期在学区网站。",
  });
  if (phase.kind === "before") {
    termLine =
      level === "uni"
        ? tf(
            lang,
            {
              en: "Fall classes start September 28 — {n} days out.",
              zh: "秋季 9 月 28 日开学，还有 {n} 天。",
            },
            { n: phase.daysUntil },
          )
        : earlyStart
          ? tf(
              lang,
              {
                en: "Kindergarten, 6th, and 9th start September 8 — {n} days out.",
                zh: "幼儿园、六年级、九年级 9 月 8 日开学，还有 {n} 天。",
              },
              { n: phase.daysUntil },
            )
          : tf(
              lang,
              {
                en: "Most 4J students start September 9 — {n} days out.",
                zh: "4J 多数学生 9 月 9 日开学，还有 {n} 天。",
              },
              { n: phase.daysUntil },
            );
  } else if (phase.kind === "during") {
    if (level === "uni") {
      const beat =
        phase.day === 1
          ? tr(lang, { en: "Classes begin today.", zh: "今天开学。" })
          : phase.day === 2
            ? tr(lang, { en: "Classes began yesterday.", zh: "昨天已经开学。" })
            : tr(lang, { en: "Term is underway.", zh: "这学期已经开始了。" });
      termLine = tf(
        lang,
        {
          en: "Fall, day {day} · week {week}. {beat}",
          zh: "秋季第 {day} 天 · 第 {week} 周。{beat}",
        },
        { day: phase.day, week: phase.week, beat },
      );
    } else {
      const off =
        clock.weekday === 0 || clock.weekday === 6
          ? tr(lang, { en: "No school today.", zh: "今天不上课。" })
          : tr(lang, { en: "School is in session.", zh: "今天要上课。" });
      termLine = tf(
        lang,
        earlyStart
          ? {
              en: "Day {day} since September 8 · week {week}. {off}",
              zh: "从 9 月 8 日算起第 {day} 天 · 第 {week} 周。{off}",
            }
          : {
              en: "Day {day} since September 9 · week {week}. {off}",
              zh: "从 9 月 9 日算起第 {day} 天 · 第 {week} 周。{off}",
            },
        { day: phase.day, week: phase.week, off },
      );
    }
  }

  const nextMins = nextBlock ? minutesUntil(nextBlock.start, clock) : null;
  const nextTimeLabel = nextBlock?.start ?? "—";
  const nextTitle = nextBlock
    ? nextBlock.title
    : todayBlocks.length > 0
      ? tr(lang, { en: "Today's classes are finished", zh: "今天的课程已结束" })
      : tr(lang, { en: "No classes scheduled today", zh: "今天没有已添加的课程" });
  const nextPlace = nextBlock?.place || tr(lang, { en: "Location not set", zh: "未填写地点" });

  function addTask() {
    const clean = draft.trim();
    if (!clean) return;
    if (notes.length >= 20) {
      setNotice({ en: "You can save up to 20 tasks. Delete one before adding another.", zh: "最多保存 20 条待办，请先删除不需要的条目。" });
      return;
    }
    addNote(clean);
    setDraft("");
    setShowComposer(false);
    setNotice({ en: "Task added.", zh: "已添加待办。" });
  }


  return {
    lang, level, earlyStart, setEarlyStart, district, notes, scheduleBlocks,
    addNote, toggleNote, removeNote, clock, todayKey, levelName, phase, dateList,
    upcoming, todayBlocks, nextBlock, scheduleRows, mode, setMode, now,
    draft, setDraft, showComposer, setShowComposer, notice, setNotice, deskOpen, deskDone,
    openCount, completed, weekItems, termLine, nextMins,
    nextTimeLabel, nextTitle, nextPlace, addTask, tr, tf, releaseLine,
  };
}
