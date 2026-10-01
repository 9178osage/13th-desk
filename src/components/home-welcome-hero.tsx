// @ts-nocheck
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight, BookOpen, CalendarDays, Check, CheckCircle2, ChevronRight,
  Clock3, CloudSun, ExternalLink, GraduationCap, LibraryBig, ListChecks,
  MapPin, Megaphone, Plus, Sparkles, Users,
} from "lucide-react";
import { WeatherCard } from "@/components/weather";
import { WeekSchedule } from "@/components/week-schedule";
import { cn } from "@/lib/cn";
import { formatDateline, formatWhen } from "@/lib/time";
import {
  announcements, quickLinks, seedTasks, typeLabel,
} from "@/components/home-dashboard-data";
import { useHomeDashboard } from "@/components/home-dashboard-context";

export function HomeWelcomeHero() {
  const {lang, level, earlyStart, setEarlyStart, district, notes, scheduleBlocks, addNote, toggleNote, removeNote, clock, todayKey, levelName, phase, upcoming, scheduleRows, mode, setMode, seedDone, setSeedDone, draft, setDraft, showComposer, setShowComposer, notice, setNotice, openCount, completed, weekItems, termLine, nextMins, nextTimeLabel, nextTitle, nextPlace, nextBlock, addTask, tr, tf, releaseLine} = useHomeDashboard();
  return (
    <>
      <section className="welcome-row" aria-labelledby="welcome-heading">
        <div>
          <p className="eyebrow">
            <span className="status-dot" aria-hidden="true" />
            {formatDateline(new Date(), lang)}
            {levelName ? ` · ${tr(lang, levelName)}` : ""}
          </p>
          <h1 id="welcome-heading">
            {tr(lang, { en: "What to do today", zh: "今天要做什么" })}
            <span className="title-mark">.</span>
          </h1>
          <p className="welcome-copy">
            {termLine}{" "}
            {tr(lang, {
              en: "Start with what matters today. The rest can wait.",
              zh: "先做今天真正要紧的事。其余的可以稍后再说。",
            })}
          </p>
          {level !== "uni" ? (
            <p className="welcome-copy" style={{ marginTop: "0.45rem", fontSize: "0.9rem" }}>
              {tr(lang, releaseLine(level, clock.weekday === 3))}
            </p>
          ) : null}
          {level !== "uni" && phase.kind !== "after" && (district === null || district === "4j") ? (
            <button
              type="button"
              aria-pressed={earlyStart}
              onClick={() => setEarlyStart(!earlyStart)}
              className="mt-3 inline-flex min-h-11 max-w-xl items-center rounded-md border border-line bg-card/90 px-3 py-2 text-left text-sm text-ink shadow-sm"
            >
              {earlyStart
                ? tr(lang, {
                    en: "Counting from September 8. Most students started the 9th.",
                    zh: "按 9 月 8 日算。多数学生是 9 月 9 日开学。",
                  })
                : tr(lang, {
                    en: "Kindergarten, 6th, and 9th started September 8. Count from that day.",
                    zh: "幼儿园、六年级、九年级是 9 月 8 日开学。按那天算。",
                  })}
            </button>
          ) : null}
        </div>
        <div className="welcome-stamp" aria-label={tr(lang, { en: "Today's focus", zh: "今日重点" })}>
          <Sparkles size={16} aria-hidden="true" />
          <span>
            <strong>{tr(lang, { en: `${openCount} open`, zh: `${openCount} 件未完成` })}</strong>
            <br />
            {tr(lang, {
              en: "Keep the list short. Eugene air helps more than another tab.",
              zh: "清单短一点。尤金的空气比再开一个标签页有用。",
            })}
          </span>
        </div>
      </section>

      <section className="hero-grid" aria-label={tr(lang, { en: "Today's overview", zh: "今日概览" })}>
        <div className="next-card panel panel-dark">
          <div className="panel-topline">
            <span className="panel-label panel-label-light">{tr(lang, { en: "NEXT UP", zh: "下一节" })}</span>
            <span className="live-label">
              <span className="live-pulse" /> {tr(lang, { en: "TODAY", zh: "今天" })}
            </span>
          </div>
          <p className="next-time">
            {nextTimeLabel.slice(0, 5)}
            <span>{tr(lang, { en: "AM/PM local", zh: "尤金时间" })}</span>
          </p>
          <h2>{nextTitle}</h2>
          <p className="next-meta">
            <MapPin size={14} aria-hidden="true" />
            <span>{nextPlace}</span>
            <span className="meta-separator">·</span>
            <span>
              {nextBlock
                ? `${nextBlock.start}–${nextBlock.end}`
                : tr(lang, { en: "Sample block · edit in schedule", zh: "示例课表 · 可在课表里改" })}
            </span>
          </p>
          <div className="next-footer">
            <span>
              {nextMins != null && nextMins > 0
                ? tr(lang, {
                    en: `Starts in`,
                    zh: `还有`,
                  })
                : tr(lang, { en: "On the desk", zh: "在课表上" })}{" "}
              <strong>
                {nextMins != null && nextMins > 0
                  ? tr(lang, {
                      en: `${nextMins} min`,
                      zh: `${nextMins} 分钟`,
                    })
                  : tr(lang, { en: "ready when you are", zh: "你准备好就行" })}
              </strong>
            </span>
            <Link className="inline-action light-action" to="/campus">
              {tr(lang, { en: "Open campus", zh: "打开校园" })} <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="schedule-card panel">
          <div className="panel-heading-row">
            <div>
              <span className="panel-label">{tr(lang, { en: "SCHEDULE", zh: "课表" })}</span>
              <h2>
                {tr(lang, {
                  en: todayKey ? "Today's rhythm" : "Weekend quiet",
                  zh: todayKey ? "今天的节奏" : "周末安静",
                })}
              </h2>
            </div>
            <Clock3 className="heading-icon" size={20} aria-hidden="true" />
          </div>
          <div className="schedule-list">
            {scheduleRows.map((item) => (
              <div className="schedule-item" key={`${item.time}-${item.titleEn}`}>
                <div className="schedule-time">
                  <strong>{item.time}</strong>
                  <span>{item.end}</span>
                </div>
                <div className={cn("schedule-marker", `marker-${item.color}`)} aria-hidden="true" />
                <div className="schedule-copy">
                  <strong>{tr(lang, { en: item.titleEn, zh: item.titleZh })}</strong>
                  <span>{item.place}</span>
                </div>
              </div>
            ))}
          </div>
          <Link className="text-link" to="/campus">
            {tr(lang, { en: "Open full schedule", zh: "打开完整课表" })}{" "}
            <ChevronRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </section>

    </>
  );
}
