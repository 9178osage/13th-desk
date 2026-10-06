import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCheck,
  Heart,
  MapPin,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { Button, Input } from "@/components/ui";
import { WeekSchedule } from "@/components/week-schedule";
import { WeatherCard } from "@/components/weather";
import { deadlines } from "@/data/guide";
import { useDesk, useLang, weekdayToScheduleDay, type Note } from "@/lib/store";
import { deskText as c, type DeskCopyKey } from "@/lib/desk-copy";
import { tr } from "@/lib/text";
import { eugeneClock, formatDateline, hmToMin } from "@/lib/time";
import { useClock } from "@/lib/use-clock";
import { nextClass, scheduleForDay } from "@/lib/schedule";
import {
  k12CalendarSource,
  k12DeadlinesForDistrict,
  k12DatesExpired,
  upcomingDeadlines,
  uoAcademicTerm,
  uoTermIsExpired,
} from "@/lib/calendar";

function TaskList() {
  const lang = useLang();
  const level = useDesk((s) => s.level);
  const hydrated = useDesk((s) => s.hydrated);
  const notes = useDesk((s) => s.buckets[s.level].notes);
  const add = useDesk((s) => s.addNote);
  const toggle = useDesk((s) => s.toggleNote);
  const remove = useDesk((s) => s.removeNote);
  const restore = useDesk((s) => s.restoreNote);
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");
  const [message, setMessage] = useState<DeskCopyKey | null>(null);
  const [deleted, setDeleted] = useState<Note | null>(null);
  const complete = notes.filter((note) => note.done).length;
  const visible = notes.filter((note) => filter === "all" || note.done === (filter === "done"));

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    if (!add(draft)) {
      setMessage("taskLimit");
      return;
    }
    setDraft("");
    setFilter("all");
    setMessage("added");
  }

  return (
    <section className="desk-panel task-panel" aria-labelledby="task-heading">
      <div className="panel-title">
        <div>
          <span className="eyebrow">{c(lang, "eyebrowTasks")}</span>
          <h2 id="task-heading">{c(lang, "tasks")}</h2>
        </div>
        <span className="task-total">
          {complete} / {notes.length}
        </span>
      </div>
      <form className="task-compose" onSubmit={submit}>
        <Input
          aria-label={c(lang, "tasks")}
          placeholder={c(lang, "taskPlaceholder")}
          maxLength={140}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={!hydrated}
        />
        <Button type="submit" disabled={!hydrated || !draft.trim()}>
          <Plus size={18} aria-hidden="true" />
          <span>{c(lang, "add")}</span>
        </Button>
      </form>
      <div className="task-filters" role="group" aria-label={c(lang, "tasks")}>
        {(["all", "pending", "done"] as const).map((key) => (
          <button
            type="button"
            key={key}
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
          >
            {c(lang, key)}{" "}
            <span>
              {key === "all" ? notes.length : key === "done" ? complete : notes.length - complete}
            </span>
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <div className="task-empty">
          <CheckCheck size={30} strokeWidth={1.3} aria-hidden="true" />
          <h3>{c(lang, notes.length ? "noFiltered" : "noTasks")}</h3>
          <p>{c(lang, "taskHint")}</p>
        </div>
      ) : (
        <ul className="desk-tasks">
          {visible.map((note) => (
            <li key={note.id} className={note.done ? "is-done" : ""}>
              <label className="task-check">
                <input type="checkbox" checked={note.done} onChange={() => toggle(note.id)} />
                <span className="check-visual" aria-hidden="true">
                  {note.done && <Check size={14} />}
                </span>
                <span>{note.text}</span>
              </label>
              <button
                type="button"
                className="icon-button"
                aria-label={c(lang, "delete") + ": " + note.text}
                onClick={() => {
                  remove(note.id);
                  setDeleted(note);
                  setMessage("deleted");
                }}
              >
                <Trash2 size={17} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="inline-feedback" role="status">
        {message && c(lang, message)}
        {deleted && (
          <button
            onClick={() => {
              if (restore(deleted, level)) {
                setDeleted(null);
                setMessage("restored");
              } else setMessage("taskLimit");
            }}
          >
            {c(lang, "undo")}
          </button>
        )}
      </div>
    </section>
  );
}

export function HomeDashboard() {
  const lang = useLang();
  const level = useDesk((s) => s.level);
  const district = useDesk((s) => s.district);
  const bucket = useDesk((s) => s.buckets[s.level]);
  const hydrated = useDesk((s) => s.hydrated);
  const langSet = useDesk((s) => s.langSet);
  const levelSet = useDesk((s) => s.levelSet);
  const setSetup = useDesk((s) => s.setSetup);
  const now = useClock();
  const clock = now ? eugeneClock(now) : null;
  const today = clock ? weekdayToScheduleDay(clock.weekday) : null;
  const classes = scheduleForDay(bucket.schedule, today);
  const next = clock ? nextClass(bucket.schedule, today, clock.minutes) : null;
  const remaining = next && clock ? hmToMin(next.start) - clock.minutes : null;
  const pending = bucket.notes.filter((note) => !note.done).length;
  const k12Source = level === "uni" ? null : k12CalendarSource(district);
  const calendarItems =
    level === "uni"
      ? deadlines
      : k12DeadlinesForDistrict(level, district);
  const termExpired =
    !!clock &&
    (level === "uni"
      ? uoTermIsExpired(clock)
      : k12Source?.hasMatchingData
        ? k12DatesExpired(level, district, clock)
        : false);
  const upcoming = clock && !termExpired ? upcomingDeadlines(calendarItems, clock, 3) : [];
  const sourceName =
    level === "uni"
      ? tr(lang, uoAcademicTerm.label)
      : k12Source
        ? tr(lang, k12Source.name)
        : "";
  const sourceHref =
    level === "uni" ? uoAcademicTerm.sourceHref : (k12Source?.href ?? null);

  return (
    <div className="home-page">
      <header className="page-intro">
        <p className="dateline">
          <span className="live-dot" />
          {now ? formatDateline(now, lang) : c(lang, "loading")}{" "}
          <span className="dateline-place"> / EUGENE, OR</span>
        </p>
        <h1>{c(lang, "welcome")}</h1>
        <p>{c(lang, "intro")}</p>
      </header>
      {(!hydrated || !langSet || !levelSet) && (
        // Rendered from the first paint so it never pushes the desk down; a
        // returning visitor's boot script hides the pending copy (boot-script.ts).
        <div className="welcome-note" data-pending={hydrated ? undefined : ""}>
          <div>
            <strong>{c(lang, "setup")}</strong>
            <p>{c(lang, "setupHint")}</p>
          </div>
          <Button variant="quiet" onClick={() => setSetup({ lang, level })}>
            {c(lang, "gotIt")}
          </Button>
        </div>
      )}
      <div className="overview-strip">
        <a href="#task-heading">
          <span className="stat-icon">
            <CheckCheck size={21} />
          </span>
          <strong>{hydrated ? pending : "—"}</strong>
          <span>{c(lang, "pending")}</span>
          <ArrowRight size={16} className="stat-arrow" />
        </a>
        <a href="#week-schedule">
          <span className="stat-icon">
            <CalendarDays size={21} />
          </span>
          <strong>{hydrated && clock ? classes.length : "—"}</strong>
          <span>{c(lang, "classes")}</span>
          <ArrowRight size={16} className="stat-arrow" />
        </a>
        <Link to="/town">
          <span className="stat-icon">
            <Heart size={21} />
          </span>
          <strong>{hydrated ? bucket.favs.length : "—"}</strong>
          <span>{c(lang, "saved")}</span>
          <ArrowRight size={16} className="stat-arrow" />
        </Link>
      </div>
      <div className="today-layout">
        <div className="today-primary">
          <TaskList key={level} />
          <WeekSchedule />
        </div>
        <div className="today-secondary">
          <section className="next-class-card" aria-labelledby="next-class-heading">
            <div className="next-card-top">
              <span>{c(lang, remaining !== null && remaining <= 0 ? "inProgress" : "next")}</span>
              <CalendarDays size={21} strokeWidth={1.5} aria-hidden="true" />
            </div>
            {!hydrated || !clock ? (
              <h2 id="next-class-heading">{c(lang, "loading")}</h2>
            ) : next ? (
              <>
                <div className="next-time">
                  {next.start}
                  <span>— {next.end}</span>
                </div>
                <h2 id="next-class-heading">{next.title}</h2>
                {next.place && (
                  <p className="next-place">
                    <MapPin size={15} />
                    {next.place}
                  </p>
                )}
                {remaining !== null && remaining > 0 && (
                  <span className="next-countdown">{c(lang, "inMinutes", { n: remaining })}</span>
                )}
              </>
            ) : (
              <>
                <h2 id="next-class-heading">{c(lang, classes.length ? "classDone" : "noClass")}</h2>
                <p>{c(lang, "noClassHint")}</p>
              </>
            )}
            <a href="#week-schedule">
              {c(lang, "manage")}
              <ArrowRight size={17} />
            </a>
          </section>
          {classes.length > 0 && (
            <section className="desk-panel agenda-panel">
              <div className="panel-title">
                <h2>{c(lang, "classes")}</h2>
              </div>
              <ol>
                {classes.map((row) => (
                  <li key={row.id} className={next?.id === row.id ? "current" : ""}>
                    <time>{row.start}</time>
                    <div>
                      <strong>
                        {row.title} {row.pinned && <Star size={12} fill="currentColor" />}
                      </strong>
                      {row.place && <span>{row.place}</span>}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
          <WeatherCard />
          <Link to="/town" className="explore-card">
            <span className="eyebrow">{c(lang, "eyebrowAround")}</span>
            <MapPin size={28} strokeWidth={1.3} aria-hidden="true" />
            <h2>{c(lang, "quick")}</h2>
            <p>{c(lang, "exploreHint")}</p>
            <span className="explore-cta">
              {c(lang, "town")} <ArrowRight size={18} />
            </span>
          </Link>
        </div>
      </div>
      <section className="desk-panel dates-panel" aria-labelledby="dates-heading">
        <div className="panel-title">
          <div>
            <span className="eyebrow">{c(lang, "eyebrowCalendar")}</span>
            <h2 id="dates-heading">{c(lang, "dates")}</h2>
          </div>
          <Link to="/guide" className="text-link">
            {c(lang, "viewGuide")}
            <ArrowRight size={16} />
          </Link>
        </div>
        <p className="section-description">
          {level !== "uni" && k12Source && !k12Source.hasMatchingData
            ? c(lang, "calendarSourcePlain")
            : c(lang, "calendarSource", { name: sourceName })}
          {level === "uni" && (
            <>
              {" · "}
              {c(lang, "verifiedOn", { date: uoAcademicTerm.lastVerified })}
              {" · "}
              <a href={uoAcademicTerm.sourceHref} target="_blank" rel="noopener noreferrer">
                {c(lang, "officialCalendar")}
              </a>
            </>
          )}
          {level !== "uni" && sourceHref && (
            <>
              {" · "}
              <a href={sourceHref} target="_blank" rel="noopener noreferrer">
                {c(lang, "officialCalendar")}
              </a>
            </>
          )}
        </p>
        <div className="desk-dates">
          {!clock ? (
            <p>{c(lang, "loading")}</p>
          ) : termExpired ? (
            <p>
              {c(lang, "termExpired")}{" "}
              {sourceHref && (
                <a href={sourceHref} target="_blank" rel="noopener noreferrer">
                  {c(lang, "officialCalendar")}
                </a>
              )}
            </p>
          ) : level !== "uni" && k12Source && !k12Source.hasMatchingData ? (
            <p>
              {c(lang, "noDistrictDates")}{" "}
              {sourceHref && (
                <a href={sourceHref} target="_blank" rel="noopener noreferrer">
                  {c(lang, "officialCalendar")}
                </a>
              )}
            </p>
          ) : upcoming.length ? (
            upcoming.map((item) => (
              <Link to="/guide" className="desk-date" key={item.id}>
                <div className="date-stamp">
                  <span>
                    {new Intl.DateTimeFormat(lang, { month: "short", timeZone: "UTC" }).format(
                      new Date(item.ymd + "T12:00:00Z"),
                    )}
                  </span>
                  <strong>{Number(item.ymd.slice(8))}</strong>
                </div>
                <div>
                  <h3>{tr(lang, item.title)}</h3>
                  <p>{tr(lang, item.detail)}</p>
                </div>
              </Link>
            ))
          ) : (
            <p>{c(lang, "noDates")}</p>
          )}
        </div>
      </section>
    </div>
  );
}
