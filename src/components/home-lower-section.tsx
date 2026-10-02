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

export function HomeLowerSection() {
  const {lang, level, earlyStart, setEarlyStart, district, notes, scheduleBlocks, addNote, toggleNote, removeNote, clock, todayKey, levelName, phase, upcoming, scheduleRows, mode, setMode, seedDone, setSeedDone, draft, setDraft, showComposer, setShowComposer, notice, setNotice, openCount, completed, weekItems, termLine, nextMins, nextTimeLabel, nextTitle, nextPlace, nextBlock, addTask, tr, tf, releaseLine} = useHomeDashboard();
  return (
    <>
      <section className="lower-grid">
        <div className="deadlines-card panel">
          <div className="panel-heading-row">
            <div>
              <span className="panel-label">{tr(lang, { en: "COMING UP", zh: "即将到来" })}</span>
              <h2>{tr(lang, { en: "Deadlines worth seeing", zh: "值得盯着的截止日期" })}</h2>
            </div>
            <BookOpen className="heading-icon" size={20} aria-hidden="true" />
          </div>
          <div className="deadline-list">
            {upcoming.length === 0 ? (
              <p className="small-note" style={{ marginTop: "0.75rem" }}>
                {tr(lang, { en: "Nothing left on this list.", zh: "这张清单里没有还没到的。" })}
              </p>
            ) : (
              upcoming.map((item, index) => {
                const day = item.ymd.slice(8, 10);
                const monthEn = new Date(`${item.ymd}T12:00:00`).toLocaleString("en-US", { month: "short" }).toUpperCase();
                const monthZh = `${Number(item.ymd.slice(5, 7))}月`;
                return (
                  <div className="deadline-row" key={item.id}>
                    <div className={cn("date-block", index === 0 && "date-soon")}>
                      <strong>{day}</strong>
                      <span>{tr(lang, { en: monthEn, zh: monthZh })}</span>
                    </div>
                    <div>
                      <strong>{tr(lang, item.title)}</strong>
                      <small>
                        {formatWhen(item.ymd, clock.ymd, lang)}
                        {" · "}
                        {tr(lang, item.detail)}
                      </small>
                    </div>
                    <ExternalLink size={15} aria-hidden="true" />
                  </div>
                );
              })
            )}
          </div>
          <Link className="text-link" to="/guide">
            {tr(lang, { en: "View all deadlines", zh: "查看全部截止日期" })}{" "}
            <ChevronRight size={15} aria-hidden="true" />
          </Link>
        </div>

        <div className="campus-card panel panel-soft">
          <div className="campus-art" aria-hidden="true">
            <div className="art-sun" />
            <div className="art-hill hill-one" />
            <div className="art-hill hill-two" />
            <div className="art-building building-one" />
            <div className="art-building building-two" />
            <div className="art-line" />
          </div>
          <div className="campus-copy">
            <span className="panel-label">{tr(lang, { en: "EUGENE, OREGON", zh: "俄勒冈 · 尤金" })}</span>
            <h2>{tr(lang, { en: "A little more outside.", zh: "多出去走走。" })}</h2>
            <p>
              {tr(lang, {
                en: "When the tabs blur together, take the long way to class. The river path is five minutes from campus.",
                zh: "标签页糊成一团时，绕远一点去上课。河畔步道离校园只要五分钟。",
              })}
            </p>
            <Link className="text-link" to="/town">
              {tr(lang, { en: "Find your next place", zh: "找下一个去处" })}{" "}
              <ChevronRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="desk-grid" aria-label={tr(lang, { en: "Desk tools", zh: "书桌工具" })}>
        <div className="panel weather-slot">
          <div className="panel-heading-row" style={{ padding: "1rem 1rem 0" }}>
            <div>
              <span className="panel-label">{tr(lang, { en: "WEATHER", zh: "天气" })}</span>
              <h2>{tr(lang, { en: "Eugene sky", zh: "尤金的天" })}</h2>
            </div>
            <CloudSun className="heading-icon" size={20} aria-hidden="true" />
          </div>
          <WeatherCard />
        </div>
        <div className="desk-notes-card panel">
          <WeekSchedule compact />
        </div>
      </section>

      <section className="footer-strip" aria-label={tr(lang, { en: "Eugene student resources", zh: "Eugene Desk资源" })}>
        <div>
          <LibraryBig size={17} aria-hidden="true" />
          <span>
            <strong>{tr(lang, { en: "Eugene Desk.", zh: "Eugene Desk。" })}</strong>{" "}
            {tr(lang, {
              en: "A warm desk with a clear dashboard — schedule, places, GPA, and today's list in one place.",
              zh: "一张有温度的书桌，配上清爽的仪表盘：课表、地点、绩点，还有今天的清单。",
            })}
          </span>
        </div>
        <span className="footer-links">
          <Link to="/campus">{tr(lang, { en: "Campus", zh: "校园" })}</Link>
          <Link to="/town">{tr(lang, { en: "Town", zh: "城里" })}</Link>
          <Link to="/gpa">{tr(lang, { en: "GPA", zh: "绩点" })}</Link>
          <Users size={16} aria-hidden="true" />
        </span>
      </section>
        </>
  );
}
