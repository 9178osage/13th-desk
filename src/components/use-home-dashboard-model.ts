// @ts-nocheck
import { useMemo, useState } from "react";
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
  fallbackSchedule,
  minutesUntil,
  seedTasks,
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

  const clock = eugeneClock();
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
    return upcomingBlocks[0] ?? todayBlocks[0] ?? null;
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
    return fallbackSchedule;
  }, [todayBlocks]);

  const [mode, setMode] = useState<"today" | "week">("today");
  const [seedDone, setSeedDone] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [notice, setNotice] = useState(
    tr(lang, { en: "Your day is intentionally light.", zh: "今天的清单故意留得轻一点。" }),
  );

  const deskOpen = notes.filter((n) => !n.done).length;
  const deskDone = notes.filter((n) => n.done).length;
  const seedOpen = seedTasks.filter((t) => !seedDone[t.id]).length;
  const seedComplete = seedTasks.filter((t) => seedDone[t.id]).length;
  const openCount = deskOpen + seedOpen;
  const completed = deskDone + seedComplete;

  const weekItems = useMemo(() => {
    const byDay = new Map<string, string[]>();
    for (const block of scheduleBlocks.filter((item) => item.pinned || true).slice(0, 12)) {
      const list = byDay.get(block.day) ?? [];
      list.push(block.title);
      byDay.set(block.day, list);
    }
    const order = ["fri", "mon", "wed", "tue", "thu"] as const;
    const labels = {
      mon: { en: "MON", zh: "一" },
      tue: { en: "TUE", zh: "二" },
      wed: { en: "WED", zh: "三" },
      thu: { en: "THU", zh: "四" },
      fri: { en: "FRI", zh: "五" },
    };
    const rows = order
      .filter((day) => byDay.has(day))
      .slice(0, 3)
      .map((day) => ({
        day,
        label: labels[day],
        title: (byDay.get(day) ?? []).slice(0, 2).join(" · "),
      }));
    if (rows.length > 0) return rows;
    return [
      { day: "fri", label: { en: "FRI", zh: "五" }, title: tr(lang, { en: "Library hold + studio hours", zh: "取预约书 + 工作室时段" }) },
      { day: "mon", label: { en: "MON", zh: "一" }, title: tr(lang, { en: "Response essay draft", zh: "回应短文草稿" }) },
      { day: "wed", label: { en: "WED", zh: "三" }, title: tr(lang, { en: "Project critique", zh: "项目点评" }) },
    ];
  }, [scheduleBlocks, lang]);

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
  const nextTimeLabel = nextBlock?.start ?? "10:00";
  const nextTitle = nextBlock
    ? nextBlock.title
    : tr(lang, { en: "Writing in the community", zh: "社区写作课" });
  const nextPlace = nextBlock?.place || "PLC 180";

  function addTask() {
    const clean = draft.trim();
    if (!clean) return;
    addNote(clean);
    setDraft("");
    setShowComposer(false);
    setNotice(tr(lang, { en: "Added to today.", zh: "已加到今天。" }));
  }


  return {
    lang, level, earlyStart, setEarlyStart, district, notes, scheduleBlocks,
    addNote, toggleNote, removeNote, clock, todayKey, levelName, phase, dateList,
    upcoming, todayBlocks, nextBlock, scheduleRows, mode, setMode, seedDone, setSeedDone,
    draft, setDraft, showComposer, setShowComposer, notice, setNotice, deskOpen, deskDone,
    seedOpen, seedComplete, openCount, completed, weekItems, termLine, nextMins,
    nextTimeLabel, nextTitle, nextPlace, addTask, tr, tf, releaseLine,
  };
}
