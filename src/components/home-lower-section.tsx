import { Link } from "@tanstack/react-router";
import { BookOpen, ChevronRight, CloudSun, ExternalLink, LibraryBig, Users } from "lucide-react";
import { WeatherCard } from "@/components/weather";
import { WeekSchedule } from "@/components/week-schedule";
import { cn } from "@/lib/cn";
import { formatWhen } from "@/lib/time";
import { useHomeDashboard } from "@/components/home-dashboard-context";

export function HomeLowerSection() {
  const { lang, upcoming, clock, tr } = useHomeDashboard();
  return (
    <>
      <section className="lower-grid">
        <div className="deadlines-card panel">
          <div className="panel-heading-row">
            <div>
              <span className="panel-label">{tr(lang, { en: "COMING UP", zh: "即将到来" })}</span>
              <h2>{tr(lang, { en: "Important dates", zh: "重要日期" })}</h2>
            </div>
            <BookOpen className="heading-icon" size={20} aria-hidden="true" />
          </div>
          <div className="deadline-list">
            {upcoming.length === 0 ? (
              <p className="small-note" style={{ marginTop: "0.75rem" }}>
                {tr(lang, { en: "No upcoming dates in this calendar.", zh: "当前校历暂无即将到来的重要日期。" })}
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
            <h2>{tr(lang, { en: "Explore Eugene", zh: "逛逛尤金" })}</h2>
            <p>
              {tr(lang, {
                en: "Browse local parks, libraries and places to study.",
                zh: "找找附近的公园、图书馆和自习地点。",
              })}
            </p>
            <Link className="text-link" to="/town">
              {tr(lang, { en: "Browse places", zh: "查看周边地点" })}{" "}
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
              <h2>{tr(lang, { en: "Eugene weather", zh: "尤金天气" })}</h2>
            </div>
            <CloudSun className="heading-icon" size={20} aria-hidden="true" />
          </div>
          <WeatherCard />
        </div>
        <div id="week-schedule" className="desk-notes-card panel">
          <WeekSchedule compact />
        </div>
      </section>

      <section className="footer-strip" aria-label={tr(lang, { en: "Eugene student resources", zh: "Eugene Desk资源" })}>
        <div>
          <LibraryBig size={17} aria-hidden="true" />
          <span>
            <strong>{tr(lang, { en: "Eugene Desk.", zh: "Eugene Desk。" })}</strong>{" "}
            {tr(lang, {
              en: "Classes, tasks, local places and GPA tools for students in Eugene.",
              zh: "面向尤金学生的课表、待办、周边地点与绩点工具。",
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
