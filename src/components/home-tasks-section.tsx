import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Check, CheckCircle2, ChevronRight, ListChecks, Megaphone, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { announcements, quickLinks } from "@/components/home-dashboard-data";
import { useHomeDashboard } from "@/components/home-dashboard-context";

export function HomeTasksSection() {
  const { lang, notes, scheduleBlocks, toggleNote, removeNote, mode, setMode, draft, setDraft, showComposer, setShowComposer, notice, setNotice, openCount, completed, weekItems, addTask, tr } = useHomeDashboard();
  return (
    <>
      <section className="content-grid">
        <div className="tasks-column">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">
                {tr(lang, { en: "TASKS", zh: "待办事项" })}
              </p>
              <h2>{tr(lang, { en: "Your tasks", zh: "我的待办" })}</h2>
            </div>
            <div className="view-toggle" role="group" aria-label={tr(lang, { en: "Task view", zh: "任务视图" })}>
              <button type="button" aria-pressed={mode === "today"} className={cn({ active: mode === "today" })} onClick={() => setMode("today")}>
                {tr(lang, { en: "Tasks", zh: "待办" })}
              </button>
              <button type="button" aria-pressed={mode === "week"} className={cn({ active: mode === "week" })} onClick={() => setMode("week")}>
                {tr(lang, { en: "Weekly schedule", zh: "每周课表" })}
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
                        aria-pressed={note.done}
                        aria-label={tr(lang, { en: `Mark task ${note.done ? "incomplete" : "complete"}: ${note.text}`, zh: `将“${note.text}”标为${note.done ? "未完成" : "已完成"}` })}
                        onClick={() => toggleNote(note.id)}
                      >
                        {note.done ? <Check size={15} /> : null}
                      </button>
                      <button type="button" className="task-copy" aria-pressed={note.done} onClick={() => toggleNote(note.id)}>
                        <strong>{note.text}</strong>
                        <small>{tr(lang, { en: "Saved on this device", zh: "保存在当前设备" })}</small>
                      </button>
                      <button
                        type="button"
                        className="task-delete"
                        aria-label={tr(lang, { en: `Delete task: ${note.text}`, zh: `删除待办：${note.text}` })}
                        onClick={() => {
                          removeNote(note.id);
                          setNotice({ en: "Task deleted.", zh: "已删除待办。" });
                        }}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                  {notes.length === 0 && <p className="small-note">{tr(lang, { en: "No tasks yet. Add an assignment or reminder.", zh: "还没有待办，可以添加作业或需要记住的事。" })}</p>}
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
                        en: "Add an assignment or reminder",
                        zh: "输入作业或提醒事项",
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
                  <span className="week-number">{String(scheduleBlocks.length).padStart(2, "0")}</span>
                  <span>
                    <strong>{tr(lang, { en: "scheduled classes", zh: "节课程" })}</strong>
                    <small>{tr(lang, { en: "in your weekly timetable", zh: "来自已添加的每周课表" })}</small>
                  </span>
                </div>
                <div className="week-lines">
                  {weekItems.length === 0 && <p className="small-note">{tr(lang, { en: "Add classes below to see your weekly schedule.", zh: "在下方添加课程后，这里会显示每周课表。" })}</p>}
                  {weekItems.map((item) => (
                    <div key={item.day}>
                      <span>{tr(lang, item.label)}</span>
                      <strong>{item.title}</strong>
                    </div>
                  ))}
                </div>
                <a className="text-link" href="#week-schedule">
                  {tr(lang, { en: "Edit weekly schedule", zh: "编辑每周课表" })}{" "}
                  <ChevronRight size={15} aria-hidden="true" />
                </a>
              </div>
            )}
          </div>
          <p className="small-note">
            <CheckCircle2 size={14} aria-hidden="true" /> {notice ? tr(lang, notice) : tr(lang, { en: "Tasks are saved on this device.", zh: "待办保存在当前设备上。" })}
          </p>
        </div>

        <aside className="aside-column">
          <div className="section-heading-row compact-heading">
            <div>
              <p className="eyebrow">{tr(lang, { en: "RESOURCES", zh: "常用工具" })}</p>
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
                <span className="panel-label">{tr(lang, { en: "REMINDERS", zh: "温馨提示" })}</span>
                <h2>{tr(lang, { en: "Student reminders", zh: "学习与生活提醒" })}</h2>
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
