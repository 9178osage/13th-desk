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

export function HomeTasksSection() {
  const {lang, level, earlyStart, setEarlyStart, district, notes, scheduleBlocks, addNote, toggleNote, removeNote, clock, todayKey, levelName, phase, upcoming, scheduleRows, mode, setMode, seedDone, setSeedDone, draft, setDraft, showComposer, setShowComposer, notice, setNotice, openCount, completed, weekItems, termLine, nextMins, nextTimeLabel, nextTitle, nextPlace, nextBlock, addTask, tr, tf, releaseLine} = useHomeDashboard();
  return (
    <>
      <section className="content-grid">
        <div className="tasks-column">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">
                {tr(lang, { en: "A SMALL LIST, A CLEAR HEAD", zh: "清单短一点，脑子清一点" })}
              </p>
              <h2>{tr(lang, { en: "Keep it moving", zh: "一件一件做" })}</h2>
            </div>
            <div className="view-toggle" role="group" aria-label={tr(lang, { en: "Task view", zh: "任务视图" })}>
              <button type="button" className={cn({ active: mode === "today" })} onClick={() => setMode("today")}>
                {tr(lang, { en: "Today", zh: "今天" })}
              </button>
              <button type="button" className={cn({ active: mode === "week" })} onClick={() => setMode("week")}>
                {tr(lang, { en: "This week", zh: "本周" })}
              </button>
            </div>
          </div>

          <div className="task-panel panel">
            {mode === "today" ? (
              <>
                <div className="task-summary">
                  <span>{tr(lang, { en: `${openCount} open items`, zh: `${openCount} 件未完成` })}</span>
                  <span>{tr(lang, { en: `${completed} complete`, zh: `${completed} 件已完成` })}</span>
                </div>
                <div className="task-list">
                  {notes.map((note) => (
                    <div className={cn("task-row", note.done && "is-done")} key={note.id}>
                      <button
                        type="button"
                        className="task-check"
                        aria-label={tr(lang, { en: "Toggle note", zh: "勾选笔记" })}
                        onClick={() => toggleNote(note.id)}
                      >
                        {note.done ? <Check size={15} /> : null}
                      </button>
                      <button type="button" className="task-copy" onClick={() => toggleNote(note.id)}>
                        <strong>{note.text}</strong>
                        <small>{tr(lang, { en: "Saved on this desk", zh: "记在这张书桌上" })}</small>
                      </button>
                      <button
                        type="button"
                        className={cn("task-type", "type-desk")}
                        onClick={() => {
                          removeNote(note.id);
                          setNotice(tr(lang, { en: "Removed from the desk.", zh: "已从书桌拿掉。" }));
                        }}
                      >
                        {tr(lang, typeLabel.desk)}
                      </button>
                    </div>
                  ))}
                  {seedTasks.map((task) => {
                    const done = Boolean(seedDone[task.id]);
                    return (
                      <button
                        type="button"
                        className={cn("task-row", done && "is-done")}
                        key={task.id}
                        onClick={() =>
                          setSeedDone((prev) => ({ ...prev, [task.id]: !prev[task.id] }))
                        }
                      >
                        <span className="task-check" aria-hidden="true">
                          {done ? <Check size={15} /> : null}
                        </span>
                        <span className="task-copy">
                          <strong>{tr(lang, { en: task.titleEn, zh: task.titleZh })}</strong>
                          <small>{tr(lang, { en: task.detailEn, zh: task.detailZh })}</small>
                        </span>
                        <span className={cn("task-type", `type-${task.type}`)}>
                          {tr(lang, typeLabel[task.type])}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {showComposer ? (
                  <form
                    className="task-composer"
                    onSubmit={(event) => {
                      event.preventDefault();
                      addTask();
                    }}
                  >
                    <input
                      autoFocus
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      maxLength={140}
                      placeholder={tr(lang, {
                        en: "What needs a place on your list?",
                        zh: "还有什么要放进清单？",
                      })}
                      aria-label={tr(lang, { en: "New task", zh: "新任务" })}
                    />
                    <button type="submit" aria-label={tr(lang, { en: "Add task", zh: "添加任务" })}>
                      <Plus size={18} />
                    </button>
                  </form>
                ) : (
                  <button type="button" className="add-task-button" onClick={() => setShowComposer(true)}>
                    <Plus size={16} aria-hidden="true" /> {tr(lang, { en: "Add a task", zh: "添加任务" })}
                  </button>
                )}
              </>
            ) : (
              <div className="week-view">
                <div className="week-stat">
                  <span className="week-number">{String(Math.max(scheduleBlocks.length, openCount, 6)).padStart(2, "0")}</span>
                  <span>
                    <strong>{tr(lang, { en: "things worth doing", zh: "件值得做的事" })}</strong>
                    <small>{tr(lang, { en: "across the next seven days", zh: "覆盖接下来七天" })}</small>
                  </span>
                </div>
                <div className="week-lines">
                  {weekItems.map((item) => (
                    <div key={item.day}>
                      <span>{tr(lang, item.label)}</span>
                      <strong>{item.title}</strong>
                    </div>
                  ))}
                </div>
                <Link className="text-link" to="/guide">
                  {tr(lang, { en: "See the full guide", zh: "查看完整指南" })}{" "}
                  <ChevronRight size={15} aria-hidden="true" />
                </Link>
              </div>
            )}
          </div>
          <p className="small-note">
            <CheckCircle2 size={14} aria-hidden="true" /> {notice}
          </p>
        </div>

        <aside className="aside-column">
          <div className="section-heading-row compact-heading">
            <div>
              <p className="eyebrow">{tr(lang, { en: "USEFUL, NOT BUSY", zh: "有用，不添乱" })}</p>
              <h2>{tr(lang, { en: "Shortcuts", zh: "快捷入口" })}</h2>
            </div>
            <ListChecks size={20} className="heading-icon" aria-hidden="true" />
          </div>
          <div className="quick-list">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link className="quick-link panel" to={item.href} key={item.href}>
                  <span className={cn("quick-icon", `quick-${item.accent}`)}>
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{tr(lang, { en: item.titleEn, zh: item.titleZh })}</strong>
                    <small>{tr(lang, { en: item.detailEn, zh: item.detailZh })}</small>
                  </span>
                  <ArrowUpRight size={16} className="quick-arrow" aria-hidden="true" />
                </Link>
              );
            })}
          </div>
          <div className="announce-panel panel">
            <div className="panel-heading-row compact-heading">
              <div>
                <span className="panel-label">{tr(lang, { en: "ANNOUNCEMENTS", zh: "公告" })}</span>
                <h2>{tr(lang, { en: "Campus notes", zh: "校园短讯" })}</h2>
              </div>
              <Megaphone className="heading-icon" size={18} aria-hidden="true" />
            </div>
            <ul className="announce-list">
              {announcements.map((item) => (
                <li key={item.titleEn}>
                  <strong>{tr(lang, { en: item.titleEn, zh: item.titleZh })}</strong>
                  <small>{tr(lang, { en: item.detailEn, zh: item.detailZh })}</small>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>

    </>
  );
}
