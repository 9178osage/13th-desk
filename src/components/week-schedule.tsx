import { useState, type FormEvent } from "react";
import { CalendarDays, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { useDesk, useLang, WEEK_DAYS, type ScheduleBlock, type WeekDay } from "@/lib/store";
import { deskText as c, dayName, type DeskCopyKey } from "@/lib/desk-copy";
import {
  hasScheduleOverlap,
  scheduleForDay,
  validScheduleTime,
  type ScheduleDraft,
} from "@/lib/schedule";

const emptyDraft = (day: WeekDay): ScheduleDraft => ({
  day,
  title: "",
  place: "",
  start: "09:00",
  end: "10:00",
});

export function WeekSchedule({ compact: _compact = false }: { compact?: boolean }) {
  const level = useDesk((s) => s.level);
  return <ScheduleEditor key={level} />;
}

function ScheduleEditor() {
  const lang = useLang();
  const level = useDesk((s) => s.level);
  const hydrated = useDesk((s) => s.hydrated);
  const schedule = useDesk((s) => s.buckets[s.level].schedule);
  const add = useDesk((s) => s.addScheduleBlock);
  const update = useDesk((s) => s.updateScheduleBlock);
  const remove = useDesk((s) => s.removeScheduleBlock);
  const restore = useDesk((s) => s.restoreScheduleBlock);
  const pin = useDesk((s) => s.toggleSchedulePin);
  const [day, setDay] = useState<WeekDay>("mon");
  const [draft, setDraft] = useState<ScheduleDraft>(emptyDraft("mon"));
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<DeskCopyKey | null>(null);
  const [deleted, setDeleted] = useState<ScheduleBlock | null>(null);
  const rows = scheduleForDay(schedule, day);
  const invalid = !validScheduleTime(draft.start, draft.end);
  const overlap = hasScheduleOverlap(schedule, draft, editing ?? undefined);

  function startEdit(row?: ScheduleBlock) {
    setEditing(row?.id ?? null);
    setDraft(row ? { ...row } : emptyDraft(day));
    setOpen(true);
    setMessage(null);
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (invalid) {
      setMessage("invalidTime");
      return;
    }
    const saved = editing ? update(editing, draft) : add(draft);
    if (!saved) {
      setMessage("classLimit");
      return;
    }
    setDay(draft.day);
    setOpen(false);
    setEditing(null);
    setMessage("classSaved");
  }

  return (
    <section
      className="desk-panel timetable-panel"
      id="week-schedule"
      aria-labelledby="schedule-heading"
    >
      <div className="panel-title">
        <div>
          <span className="eyebrow">YOUR WEEK</span>
          <h2 id="schedule-heading">{c(lang, "timetable")}</h2>
        </div>
        <Button variant="quiet" onClick={() => startEdit()} disabled={!hydrated || open}>
          <Plus size={17} aria-hidden="true" />
          {c(lang, "addClass")}
        </Button>
      </div>
      <p className="section-description">{c(lang, "recurring")}</p>
      <div className="week-tabs" role="group" aria-label={c(lang, "day")}>
        {WEEK_DAYS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={day === item.id}
            onClick={() => setDay(item.id)}
          >
            <span>{dayName(lang, item.id)}</span>
            <span className="day-count">
              {schedule.filter((row) => row.day === item.id).length}
            </span>
          </button>
        ))}
      </div>
      {open && (
        <form className="class-form" onSubmit={submit}>
          <div className="form-heading">
            <h3>{c(lang, editing ? "editClass" : "addClass")}</h3>
            <button
              type="button"
              className="icon-button"
              onClick={() => setOpen(false)}
              aria-label={c(lang, "cancel")}
            >
              <X size={18} />
            </button>
          </div>
          <div className="class-form-grid">
            <label className="field field-wide">
              <span>{c(lang, "title")}</span>
              <Input
                autoFocus
                required
                maxLength={60}
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </label>
            <label className="field field-wide">
              <span>{c(lang, "place")}</span>
              <Input
                maxLength={60}
                value={draft.place}
                onChange={(e) => setDraft({ ...draft, place: e.target.value })}
              />
            </label>
            <label className="field">
              <span>{c(lang, "day")}</span>
              <select
                value={draft.day}
                onChange={(e) => setDraft({ ...draft, day: e.target.value as WeekDay })}
              >
                {WEEK_DAYS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {dayName(lang, item.id)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{c(lang, "start")}</span>
              <Input
                type="time"
                required
                value={draft.start}
                onInput={(e) => {
                  const start = e.currentTarget.value;
                  setDraft((value) => ({ ...value, start }));
                }}
                onChange={(e) => setDraft((value) => ({ ...value, start: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>{c(lang, "end")}</span>
              <Input
                type="time"
                required
                aria-invalid={invalid}
                aria-describedby={invalid ? "class-time-error" : undefined}
                value={draft.end}
                onInput={(e) => {
                  const end = e.currentTarget.value;
                  setDraft((value) => ({ ...value, end }));
                }}
                onChange={(e) => setDraft((value) => ({ ...value, end: e.target.value }))}
              />
            </label>
          </div>
          {invalid && (
            <p className="form-error" id="class-time-error">
              {c(lang, "invalidTime")}
            </p>
          )}
          {!invalid && overlap && <p className="form-warning">{c(lang, "overlap")}</p>}
          <div className="form-actions">
            <Button type="submit" disabled={!draft.title.trim() || invalid}>
              {c(lang, editing ? "save" : "addClass")}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {c(lang, "cancel")}
            </Button>
          </div>
        </form>
      )}
      <div className="class-list">
        {rows.length === 0 ? (
          <div className="schedule-empty">
            <CalendarDays size={26} strokeWidth={1.4} aria-hidden="true" />
            <p>{c(lang, "noDay")}</p>
          </div>
        ) : (
          rows.map((row) => (
            <div className="class-row" key={row.id}>
              <div className="class-time">
                <strong>{row.start}</strong>
                <span>{row.end}</span>
              </div>
              <div className="class-details">
                <strong>
                  {row.title}{" "}
                  {row.pinned && (
                    <Star
                      className="important-star"
                      size={13}
                      fill="currentColor"
                      aria-label={c(lang, "important")}
                    />
                  )}
                </strong>
                {row.place && <span>{row.place}</span>}
                {!validScheduleTime(row.start, row.end) && (
                  <span className="form-error">{c(lang, "invalidTime")}</span>
                )}
              </div>
              <div className="class-actions">
                <button
                  className="icon-button"
                  aria-pressed={row.pinned}
                  aria-label={c(lang, row.pinned ? "unpin" : "pin") + ": " + row.title}
                  onClick={() => pin(row.id)}
                >
                  <Star size={17} fill={row.pinned ? "currentColor" : "none"} />
                </button>
                <button
                  className="icon-button"
                  aria-label={c(lang, "edit") + ": " + row.title}
                  onClick={() => startEdit(row)}
                >
                  <Pencil size={17} />
                </button>
                <button
                  className="icon-button"
                  aria-label={c(lang, "delete") + ": " + row.title}
                  onClick={() => {
                    remove(row.id);
                    setDeleted(row);
                    setMessage("deleted");
                    if (editing === row.id) setOpen(false);
                  }}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="inline-feedback" role="status">
        {message && c(lang, message)}
        {deleted && (
          <button
            type="button"
            onClick={() => {
              if (restore(deleted, level)) {
                setDeleted(null);
                setMessage("restored");
              } else setMessage("classLimit");
            }}
          >
            {c(lang, "undo")}
          </button>
        )}
      </div>
    </section>
  );
}
