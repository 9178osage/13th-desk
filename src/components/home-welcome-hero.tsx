import { ArrowUpRight, ChevronRight, Clock3, MapPin, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDateline } from "@/lib/time";
import { useHomeDashboard } from "@/components/home-dashboard-context";

export function HomeWelcomeHero() {
  const { lang, levelName, now, openCount, scheduleRows, nextMins, nextTimeLabel, nextTitle, nextPlace, nextBlock, tr } = useHomeDashboard();
  const inProgress = nextMins !== null && nextMins <= 0;
  return (
    <>
      <section className="welcome-row" aria-labelledby="welcome-heading">
        <div>
          <p className="eyebrow">
            <span className="status-dot" aria-hidden="true" />
            {now ? formatDateline(now, lang) : tr(lang, { en: "Loading date…", zh: "正在加载日期…" })}
            {levelName ? ` · ${tr(lang, levelName)}` : ""}
          </p>
          <h1 id="welcome-heading">
            {tr(lang, { en: "What to do today", zh: "今天要做什么" })}
            <span className="title-mark">.</span>
          </h1>
          <p className="welcome-copy">
            {tr(lang, { en: "Your classes, tasks and upcoming dates in one place.", zh: "查看今天的课程、待办和近期重要日期。" })}
          </p>
        </div>
        <div className="welcome-stamp" aria-label={tr(lang, { en: "Today's focus", zh: "今日重点" })}>
          <Sparkles size={16} aria-hidden="true" />
          <span>
            <strong>{tr(lang, { en: `${openCount} open`, zh: `${openCount} 件未完成` })}</strong>
            <br />
            {tr(lang, {
              en: "Tasks saved on this device.",
              zh: "待办保存在当前设备上。",
            })}
          </span>
        </div>
      </section>

      <section className="hero-grid" aria-label={tr(lang, { en: "Today's overview", zh: "今日概览" })}>
        <div className="next-card panel panel-dark">
          <div className="panel-topline">
            <span className="panel-label panel-label-light">{tr(lang, inProgress ? { en: "IN PROGRESS", zh: "正在上课" } : { en: "NEXT CLASS", zh: "接下来的课程" })}</span>
            <span className="live-label">
              <span className="live-pulse" /> {tr(lang, { en: "TODAY", zh: "今天" })}
            </span>
          </div>
          <p className="next-time">
            {now ? nextTimeLabel : "—"}
            <span>{tr(lang, { en: "Eugene · 24h", zh: "尤金时间" })}</span>
          </p>
          <h2>{now ? nextTitle : tr(lang, { en: "Loading schedule…", zh: "正在加载课表…" })}</h2>
          {nextBlock && now ? (
            <p className="next-meta"><MapPin size={14} aria-hidden="true" /> {nextPlace} · {nextBlock.start}–{nextBlock.end}</p>
          ) : null}
          <div className="next-footer">
            <span>{now && nextMins !== null
              ? tr(lang, nextMins > 0 ? { en: `Starts in ${nextMins} min`, zh: `还有 ${nextMins} 分钟开始` } : { en: "Class is in progress", zh: "课程进行中" })
              : tr(lang, { en: "Add or edit classes below.", zh: "可在下方添加或编辑课表。" })}</span>
            <a className="inline-action light-action" href="#week-schedule">
              {tr(lang, { en: "Edit schedule", zh: "编辑课表" })} <ArrowUpRight size={15} aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="schedule-card panel">
          <div className="panel-heading-row">
            <div>
              <span className="panel-label">{tr(lang, { en: "SCHEDULE", zh: "课表" })}</span>
              <h2>
                {tr(lang, {
                  en: "Today’s classes",
                  zh: "今日课表",
                })}
              </h2>
            </div>
            <Clock3 className="heading-icon" size={20} aria-hidden="true" />
          </div>
          <div className="schedule-list">
            {scheduleRows.length === 0 && <p className="small-note">{tr(lang, { en: "No classes added for today.", zh: "今天还没有添加课程。" })}</p>}
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
          <a className="text-link" href="#week-schedule">
            {tr(lang, { en: "Open full schedule", zh: "打开完整课表" })}{" "}
            <ChevronRight size={15} aria-hidden="true" />
          </a>
        </div>
      </section>

    </>
  );
}
