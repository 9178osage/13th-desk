import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  GraduationCap,
  LibraryBig,
  ListChecks,
  MapPin,
  Megaphone,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLang } from "@/lib/store";
import { tr } from "@/lib/text";

type Task = {
  id: number;
  titleEn: string;
  titleZh: string;
  detailEn: string;
  detailZh: string;
  type: "class" | "life" | "campus";
  done: boolean;
};

const initialTasks: Task[] = [
  { id: 1, titleEn: "Read chapter 4", titleZh: "读第 4 章", detailEn: "ENG 101 · due today", detailZh: "ENG 101 · 今天交", type: "class", done: false },
  { id: 2, titleEn: "Pick up library hold", titleZh: "取图书馆预约书", detailEn: "Knight Library · before 6:00 PM", detailZh: "Knight 图书馆 · 下午 6 点前", type: "campus", done: false },
  { id: 3, titleEn: "Call home", titleZh: "给家里打个电话", detailEn: "A small thing that matters", detailZh: "小事，但很重要", type: "life", done: false },
];

const schedule = [
  { time: "10:00", end: "10:50", titleEn: "Writing in the community", titleZh: "社区写作课", place: "PLC 180", color: "blue" },
  { time: "12:00", end: "13:00", titleEn: "Lunch + open studio", titleZh: "午饭 + 开放工作室", place: "Erb Memorial Union", color: "slate" },
  { time: "14:00", end: "15:15", titleEn: "Data & visual stories", titleZh: "数据与视觉叙事", place: "Allen Hall 206", color: "teal" },
];

const deadlines = [
  { date: "03", monthEn: "OCT", monthZh: "10月", titleEn: "ENG 101 · Response essay", titleZh: "ENG 101 · 回应短文", metaEn: "Canvas · 11:59 PM", metaZh: "Canvas · 晚上 11:59", tone: "soon" },
  { date: "07", monthEn: "OCT", monthZh: "10月", titleEn: "Design lab · Project critique", titleZh: "设计课 · 项目点评", metaEn: "Allen Hall · in class", metaZh: "Allen Hall · 课上", tone: "normal" },
  { date: "14", monthEn: "OCT", monthZh: "10月", titleEn: "Statistics · Midterm", titleZh: "统计 · 期中考试", metaEn: "PLC 180 · 2:00 PM", metaZh: "PLC 180 · 下午 2:00", tone: "normal" },
];

const announcements = [
  { titleEn: "Fall advising week opens Monday", titleZh: "秋季选课咨询周周一开始", detailEn: "Book a 20-minute slot before priority registration.", detailZh: "优先注册前预约 20 分钟咨询。" },
  { titleEn: "Knight Library late hours resume", titleZh: "Knight 图书馆恢复晚间开放", detailEn: "Sunday–Thursday until midnight for midterms.", detailZh: "为期中复习，周日到周四开到午夜。" },
];

const quickLinks = [
  { titleEn: "Find a study spot", titleZh: "找自习点", detailEn: "Quiet rooms, coffee, late hours", detailZh: "安静教室、咖啡、晚间开放", href: "/town", icon: MapPin, accent: "blue" },
  { titleEn: "Plan your week", titleZh: "安排本周", detailEn: "Classes, errands, breathing room", detailZh: "课程、杂事、留一点空档", href: "/guide", icon: CalendarDays, accent: "teal" },
  { titleEn: "Check your GPA", titleZh: "看看绩点", detailEn: "A clear view of your progress", detailZh: "一眼看清学业进度", href: "/gpa", icon: GraduationCap, accent: "ink" },
];

const typeLabel = {
  class: { en: "class", zh: "课程" },
  campus: { en: "campus", zh: "校园" },
  life: { en: "life", zh: "生活" },
} as const;

export function HomeDashboard() {
  const lang = useLang();
  const [tasks, setTasks] = useState(initialTasks);
  const [mode, setMode] = useState<"today" | "week">("today");
  const [showComposer, setShowComposer] = useState(false);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState(tr(lang, { en: "Your day is intentionally light.", zh: "今天的清单故意留得轻一点。" }));
  const completed = useMemo(() => tasks.filter((task) => task.done).length, [tasks]);
  const openCount = tasks.length - completed;

  function toggleTask(id: number) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)));
    setNotice(tr(lang, { en: "Nice. One less thing to carry.", zh: "很好。又少了一件要操心的事。" }));
  }

  function addTask() {
    const title = draft.trim();
    if (!title) return;
    setTasks((current) => [...current, { id: Date.now(), titleEn: title, titleZh: title, detailEn: "Personal task", detailZh: "个人待办", type: "life", done: false }]);
    setDraft("");
    setShowComposer(false);
    setNotice(tr(lang, { en: "Added to today.", zh: "已加到今天。" }));
  }

  return (
    <div className="home-page">
      <section className="welcome-row" aria-labelledby="welcome-heading">
        <div>
          <p className="eyebrow"><span className="status-dot" /> {tr(lang, { en: "THURSDAY · OCTOBER 1, 2026", zh: "周四 · 2026 年 10 月 1 日" })}</p>
          <h1 id="welcome-heading">{tr(lang, { en: "What to do today", zh: "今天要做什么" })}<span className="title-mark">.</span></h1>
          <p className="welcome-copy">{tr(lang, { en: "Start with what matters today. The rest can wait.", zh: "先做今天真正要紧的事。其余的可以稍后再说。" })}</p>
        </div>
        <div className="welcome-stamp" aria-label={tr(lang, { en: "Today's focus", zh: "今日重点" })}>
          <Sparkles size={16} aria-hidden="true" />
          <span><strong>{tr(lang, { en: "Focus", zh: "专注" })}</strong><br />{tr(lang, { en: "Make room for good work.", zh: "给认真做事留出空间。" })}</span>
        </div>
      </section>

      <section className="hero-grid" aria-label={tr(lang, { en: "Today's overview", zh: "今日概览" })}>
        <div className="next-card panel panel-dark">
          <div className="panel-topline">
            <span className="panel-label panel-label-light">{tr(lang, { en: "UP NEXT", zh: "下一节课" })}</span>
            <span className="live-label"><span className="live-pulse" /> {tr(lang, { en: "TODAY", zh: "今天" })}</span>
          </div>
          <div className="next-time">10:00 <span>AM</span></div>
          <h2>{tr(lang, { en: "Writing in the community", zh: "社区写作课" })}</h2>
          <p className="next-meta"><MapPin size={15} aria-hidden="true" /> PLC 180 <span className="meta-separator">·</span> {tr(lang, { en: "50 min", zh: "50 分钟" })}</p>
          <div className="next-footer">
            <span>{tr(lang, { en: "Starts in", zh: "还有" })} <strong>{tr(lang, { en: "42 min", zh: "42 分钟" })}</strong></span>
            <button type="button" className="inline-action light-action" onClick={() => setNotice(tr(lang, { en: "Class reminder saved for 9:45 AM.", zh: "已记下 9:45 上课提醒。" }))}>
              {tr(lang, { en: "Add reminder", zh: "加提醒" })} <ArrowUpRight size={15} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="schedule-card panel">
          <div className="panel-heading-row">
            <div><span className="panel-label">{tr(lang, { en: "SCHEDULE", zh: "课表" })}</span><h2>{tr(lang, { en: "Thursday rhythm", zh: "周四节奏" })}</h2></div>
            <Clock3 className="heading-icon" size={20} aria-hidden="true" />
          </div>
          <div className="schedule-list">
            {schedule.map((item) => (
              <div className="schedule-item" key={item.time}>
                <div className="schedule-time"><strong>{item.time}</strong><span>{item.end}</span></div>
                <div className={cn("schedule-marker", `marker-${item.color}`)} aria-hidden="true" />
                <div className="schedule-copy"><strong>{tr(lang, { en: item.titleEn, zh: item.titleZh })}</strong><span>{item.place}</span></div>
              </div>
            ))}
          </div>
          <Link className="text-link" to="/campus">{tr(lang, { en: "Open full schedule", zh: "打开完整课表" })} <ChevronRight size={15} aria-hidden="true" /></Link>
        </div>
      </section>

      <section className="content-grid">
        <div className="tasks-column">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">{tr(lang, { en: "A SMALL LIST, A CLEAR HEAD", zh: "清单短一点，脑子清一点" })}</p>
              <h2>{tr(lang, { en: "Keep it moving", zh: "一件一件做" })}</h2>
            </div>
            <div className="view-toggle" role="group" aria-label={tr(lang, { en: "Task view", zh: "任务视图" })}>
              <button type="button" className={cn({ active: mode === "today" })} onClick={() => setMode("today")}>{tr(lang, { en: "Today", zh: "今天" })}</button>
              <button type="button" className={cn({ active: mode === "week" })} onClick={() => setMode("week")}>{tr(lang, { en: "This week", zh: "本周" })}</button>
            </div>
          </div>
          <div className="task-panel panel">
            {mode === "today" ? (
              <>
                <div className="task-summary"><span>{tr(lang, { en: `${openCount} open items`, zh: `${openCount} 件未完成` })}</span><span>{tr(lang, { en: `${completed} complete`, zh: `${completed} 件已完成` })}</span></div>
                <div className="task-list">
                  {tasks.map((task) => (
                    <button type="button" className={cn("task-row", task.done && "is-done")} key={task.id} onClick={() => toggleTask(task.id)}>
                      <span className="task-check" aria-hidden="true">{task.done ? <Check size={15} /> : null}</span>
                      <span className="task-copy"><strong>{tr(lang, { en: task.titleEn, zh: task.titleZh })}</strong><small>{tr(lang, { en: task.detailEn, zh: task.detailZh })}</small></span>
                      <span className={cn("task-type", `type-${task.type}`)}>{tr(lang, typeLabel[task.type])}</span>
                    </button>
                  ))}
                </div>
                {showComposer ? (
                  <form className="task-composer" onSubmit={(event) => { event.preventDefault(); addTask(); }}>
                    <input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={tr(lang, { en: "What needs a place on your list?", zh: "还有什么要放进清单？" })} aria-label={tr(lang, { en: "New task", zh: "新任务" })} />
                    <button type="submit" aria-label={tr(lang, { en: "Add task", zh: "添加任务" })}><Plus size={18} /></button>
                  </form>
                ) : (
                  <button type="button" className="add-task-button" onClick={() => setShowComposer(true)}><Plus size={16} aria-hidden="true" /> {tr(lang, { en: "Add a task", zh: "添加任务" })}</button>
                )}
              </>
            ) : (
              <div className="week-view">
                <div className="week-stat"><span className="week-number">06</span><span><strong>{tr(lang, { en: "things worth doing", zh: "件值得做的事" })}</strong><small>{tr(lang, { en: "across the next seven days", zh: "覆盖接下来七天" })}</small></span></div>
                <div className="week-lines">
                  <div><span>{tr(lang, { en: "FRI", zh: "五" })}</span><strong>{tr(lang, { en: "Library hold + studio hours", zh: "取预约书 + 工作室时段" })}</strong></div>
                  <div><span>{tr(lang, { en: "MON", zh: "一" })}</span><strong>{tr(lang, { en: "Response essay draft", zh: "回应短文草稿" })}</strong></div>
                  <div><span>{tr(lang, { en: "WED", zh: "三" })}</span><strong>{tr(lang, { en: "Project critique", zh: "项目点评" })}</strong></div>
                </div>
                <Link className="text-link" to="/guide">{tr(lang, { en: "See the full guide", zh: "查看完整指南" })} <ChevronRight size={15} aria-hidden="true" /></Link>
              </div>
            )}
          </div>
          <p className="small-note"><CheckCircle2 size={14} aria-hidden="true" /> {notice}</p>
        </div>

        <aside className="aside-column">
          <div className="section-heading-row compact-heading">
            <div><p className="eyebrow">{tr(lang, { en: "USEFUL, NOT BUSY", zh: "有用，不添乱" })}</p><h2>{tr(lang, { en: "Shortcuts", zh: "快捷入口" })}</h2></div>
            <ListChecks size={20} className="heading-icon" aria-hidden="true" />
          </div>
          <div className="quick-list">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link className="quick-link panel" to={item.href} key={item.href}>
                  <span className={cn("quick-icon", `quick-${item.accent}`)}><Icon size={19} aria-hidden="true" /></span>
                  <span><strong>{tr(lang, { en: item.titleEn, zh: item.titleZh })}</strong><small>{tr(lang, { en: item.detailEn, zh: item.detailZh })}</small></span>
                  <ArrowUpRight size={16} className="quick-arrow" aria-hidden="true" />
                </Link>
              );
            })}
          </div>
          <div className="announce-panel panel">
            <div className="panel-heading-row compact-heading">
              <div><span className="panel-label">{tr(lang, { en: "ANNOUNCEMENTS", zh: "公告" })}</span><h2>{tr(lang, { en: "Campus notes", zh: "校园短讯" })}</h2></div>
              <Megaphone className="heading-icon" size={18} aria-hidden="true" />
            </div>
            <ul className="announce-list">
              {announcements.map((item) => (
                <li key={item.titleEn}><strong>{tr(lang, { en: item.titleEn, zh: item.titleZh })}</strong><small>{tr(lang, { en: item.detailEn, zh: item.detailZh })}</small></li>
              ))}
            </ul>
          </div>
        </aside>
      </section>

      <section className="lower-grid">
        <div className="deadlines-card panel">
          <div className="panel-heading-row">
            <div><span className="panel-label">{tr(lang, { en: "COMING UP", zh: "即将到来" })}</span><h2>{tr(lang, { en: "Deadlines worth seeing", zh: "值得盯着的截止日期" })}</h2></div>
            <BookOpen className="heading-icon" size={20} aria-hidden="true" />
          </div>
          <div className="deadline-list">
            {deadlines.map((item) => (
              <div className="deadline-row" key={item.titleEn}>
                <div className={cn("date-block", item.tone === "soon" && "date-soon")}><strong>{item.date}</strong><span>{tr(lang, { en: item.monthEn, zh: item.monthZh })}</span></div>
                <div><strong>{tr(lang, { en: item.titleEn, zh: item.titleZh })}</strong><small>{tr(lang, { en: item.metaEn, zh: item.metaZh })}</small></div>
                <ExternalLink size={15} aria-hidden="true" />
              </div>
            ))}
          </div>
          <Link className="text-link" to="/guide">{tr(lang, { en: "View all deadlines", zh: "查看全部截止日期" })} <ChevronRight size={15} aria-hidden="true" /></Link>
        </div>

        <div className="campus-card panel panel-soft">
          <div className="campus-art" aria-hidden="true"><div className="art-sun" /><div className="art-hill hill-one" /><div className="art-hill hill-two" /><div className="art-building building-one" /><div className="art-building building-two" /><div className="art-line" /></div>
          <div className="campus-copy">
            <span className="panel-label">{tr(lang, { en: "EUGENE, OREGON", zh: "俄勒冈 · 尤金" })}</span>
            <h2>{tr(lang, { en: "A little more outside.", zh: "多出去走走。" })}</h2>
            <p>{tr(lang, { en: "When the tabs blur together, take the long way to class. The river path is five minutes from campus.", zh: "标签页糊成一团时，绕远一点去上课。河畔步道离校园只要五分钟。" })}</p>
            <Link className="text-link" to="/town">{tr(lang, { en: "Find your next place", zh: "找下一个去处" })} <ChevronRight size={15} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      <section className="footer-strip" aria-label={tr(lang, { en: "Eugene student resources", zh: "尤金学生资源" })}>
        <div><LibraryBig size={17} aria-hidden="true" /><span><strong>{tr(lang, { en: "Campus, made easier.", zh: "校园，更省心。" })}</strong> {tr(lang, { en: "A quick home for the bits of student life that usually live in five tabs.", zh: "把散落在五个标签页里的学生日常收拢到一处。" })}</span></div>
        <span className="footer-links"><Link to="/campus">{tr(lang, { en: "Campus", zh: "校园" })}</Link><Link to="/town">{tr(lang, { en: "Town", zh: "城里" })}</Link><Link to="/gpa">{tr(lang, { en: "GPA", zh: "绩点" })}</Link><Users size={16} aria-hidden="true" /></span>
      </section>
    </div>
  );
}
