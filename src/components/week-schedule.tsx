import { useState, type FormEvent } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ImageDown,
  Pencil,
  Plus,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { LEVELS } from "@/lib/levels";
import { tr } from "@/lib/text";
import { sampleSlots } from "@/lib/schedule-samples";
import { Button, Input } from "@/components/ui";
import { useDesk, useLang, WEEK_DAYS, type ScheduleBlock, type WeekDay } from "@/lib/store";
import { deskText as c, dayName, type DeskCopyKey } from "@/lib/desk-copy";
import {
  conflictingClassIds,
  overlappingClasses,
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

export function WeekSchedule() {
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
  const [awaitConfirm, setAwaitConfirm] = useState(false);
  const rows = scheduleForDay(schedule, day);
  const invalid = !validScheduleTime(draft.start, draft.end);
  const conflicts = overlappingClasses(schedule, draft, editing ?? undefined);
  const overlap = conflicts.length > 0;
  const conflictIds = conflictingClassIds(schedule);

  function startEdit(row?: ScheduleBlock) {
    setEditing(row?.id ?? null);
    setDraft(row ? { ...row } : emptyDraft(day));
    setOpen(true);
    setMessage(null);
    setAwaitConfirm(false);
    // Same reason as the save path: the stale undo key no longer matches what the
    // feedback line is talking about.
    setDeleted(null);
  }

  function saveDraft() {
    // add() can fail on the 40-class cap or on stale/blank input; update() only
    // fails when the row is gone (deleted in another tab) or the input is stale,
    // so never report the cap for an edit — close the form and say what happened.
    const saved = editing ? update(editing, draft) : add(draft);
    if (!saved) {
      setMessage(editing ? "classGone" : "classLimit");
      setAwaitConfirm(false);
      if (editing) {
        setOpen(false);
        setEditing(null);
      }
      return;
    }
    setDay(draft.day);
    setOpen(false);
    setEditing(null);
    setAwaitConfirm(false);
    setMessage("classSaved");
    setDeleted(null);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (invalid) {
      setMessage("invalidTime");
      setAwaitConfirm(false);
      return;
    }
    if (overlap && !awaitConfirm) {
      setAwaitConfirm(true);
      setMessage(null);
      return;
    }
    saveDraft();
  }

  function fillSamples() {
    let added = 0;
    for (const slot of sampleSlots(level)) {
      const ok = add({
        day: slot.day,
        start: slot.start,
        end: slot.end,
        title: c(lang, "sampleClass", { n: slot.n }),
        place: "",
      });
      if (ok) added += 1;
    }
    setDay(sampleSlots(level)[0]?.day ?? "mon");
    setMessage(added ? "sampleHint" : "classLimit");
    if (added) setDeleted(null);
  }

  const [exporting, setExporting] = useState(false);
  async function exportLockScreen() {
    setExporting(true);
    try {
      // Canvas drawing code is fetched only now; nothing is mounted in the page.
      const { drawLockScreen, downloadPng } = await import("@/lib/lock-screen");
      const levelInfo = LEVELS.find((item) => item.id === level);
      const blob = await drawLockScreen(schedule, {
        title: c(lang, "weekTitle"),
        subtitle: `Eugene · ${levelInfo ? tr(lang, levelInfo) : ""}`,
        days: {
          mon: dayName(lang, "mon"),
          tue: dayName(lang, "tue"),
          wed: dayName(lang, "wed"),
          thu: dayName(lang, "thu"),
          fri: dayName(lang, "fri"),
        },
      });
      downloadPng(blob);
      setMessage("lockImageSaved");
      setDeleted(null);
    } catch {
      setMessage("lockImageFailed");
    } finally {
      setExporting(false);
    }
  }

  function patchDraft(next: ScheduleDraft) {
    setDraft(next);
    setAwaitConfirm(false);
  }

  return (
    <section
      className="desk-panel timetable-panel"
      id="week-schedule"
      aria-labelledby="schedule-heading"
    >
      <div className="panel-title">
        <div>
          <span className="eyebrow">{c(lang, "eyebrowWeek")}</span>
          <h2 id="schedule-heading">{c(lang, "timetable")}</h2>
        </div>
        <div className="panel-actions">
          {hydrated && schedule.length > 0 && (
            <Button variant="ghost" onClick={() => void exportLockScreen()} disabled={exporting}>
              <ImageDown size={17} aria-hidden="true" />
              {c(lang, "lockImage")}
            </Button>
          )}
          <Button variant="quiet" onClick={() => startEdit()} disabled={!hydrated || open}>
            <Plus size={17} aria-hidden="true" />
            {c(lang, "addClass")}
          </Button>
        </div>
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
              onClick={() => {
                setOpen(false);
                setAwaitConfirm(false);
              }}
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
                onChange={(e) => patchDraft({ ...draft, title: e.target.value })}
              />
            </label>
            <label className="field field-wide">
              <span>{c(lang, "place")}</span>
              <Input
                maxLength={60}
                value={draft.place}
                onChange={(e) => patchDraft({ ...draft, place: e.target.value })}
              />
            </label>
            <label className="field">
              <span>{c(lang, "day")}</span>
              <select
                value={draft.day}
                onChange={(e) => patchDraft({ ...draft, day: e.target.value as WeekDay })}
              >
                {WEEK_DAYS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {dayName(lang, item.id)}
                  </option>
                ))}
              </select>
            </label>
            <label className={`field${overlap && !invalid ? " field-conflict" : ""}`}>
              <span>{c(lang, "start")}</span>
              <Input
                type="time"
                required
                aria-invalid={invalid || overlap}
                value={draft.start}
                // onChange already listens to the native input event: no second
                // onInput handler, or every keystroke would patch the draft twice.
                onChange={(e) => patchDraft({ ...draft, start: e.target.value })}
              />
            </label>
            <label className={`field${overlap && !invalid ? " field-conflict" : ""}`}>
              <span>{c(lang, "end")}</span>
              <Input
                type="time"
                required
                aria-invalid={invalid}
                aria-describedby={invalid ? "class-time-error" : undefined}
                value={draft.end}
                onChange={(e) => patchDraft({ ...draft, end: e.target.value })}
              />
            </label>
          </div>
          {invalid && (
            <p className="form-error" id="class-time-error">
              {c(lang, "invalidTime")}
            </p>
          )}
          {!invalid && overlap && (
            <div className="form-warning conflict-box" role="alert">
              <p>{c(lang, "overlap")}</p>
              <p>
                {c(lang, "overlapWith", {
                  list: conflicts
                    .map((row) => `${row.title} (${row.start}–${row.end})`)
                    .join(lang === "zh" || lang === "ja" ? "；" : "; "),
                })}
              </p>
              {awaitConfirm && <p>{c(lang, "overlapConfirm")}</p>}
            </div>
          )}
          <div className="form-actions">
            <Button type="submit" disabled={!draft.title.trim() || invalid}>
              {awaitConfirm && overlap
                ? c(lang, "saveAnyway")
                : c(lang, editing ? "save" : "addClass")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setAwaitConfirm(false);
              }}
            >
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
            {hydrated && schedule.length === 0 && !open && (
              <Button variant="quiet" onClick={fillSamples}>
                <Sparkles size={16} aria-hidden="true" />
                {c(lang, "fillSample")}
              </Button>
            )}
          </div>
        ) : (
          rows.map((row) => {
            const inConflict = conflictIds.has(row.id);
            const conflictsDraft = open && overlap && conflicts.some((item) => item.id === row.id);
            return (
              <div
                className={`class-row${inConflict || conflictsDraft ? " class-row-conflict" : ""}`}
                key={row.id}
              >
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
                  {(inConflict || conflictsDraft) && validScheduleTime(row.start, row.end) && (
                    <span className="conflict-badge">
                      <AlertTriangle size={12} aria-hidden="true" />
                      {c(lang, "conflictMark")}
                    </span>
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
                      if (editing === row.id) {
                        setOpen(false);
                        setAwaitConfirm(false);
                      }
                    }}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            );
          })
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
              } else setMessage("undoFailed");
            }}
          >
            {c(lang, "undo")}
          </button>
        )}
      </div>
    </section>
  );
}
