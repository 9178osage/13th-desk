import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Pin, Trash2 } from "lucide-react";
import { Button, Card, Chip, EmptyState, Input, SectionHeader } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  WEEK_DAYS,
  useDesk,
  useLang,
  weekdayToScheduleDay,
  type WeekDay,
} from "@/lib/store";
import { tr } from "@/lib/text";
import { eugeneClock } from "@/lib/time";

export function WeekSchedule({ compact = false }: { compact?: boolean }) {
  const lang = useLang();
  const schedule = useDesk((state) => state.buckets[state.level].schedule);
  const addScheduleBlock = useDesk((state) => state.addScheduleBlock);
  const removeScheduleBlock = useDesk((state) => state.removeScheduleBlock);
  const toggleSchedulePin = useDesk((state) => state.toggleSchedulePin);
  const clock = eugeneClock();
  const today = weekdayToScheduleDay(clock.weekday);

  const [day, setDay] = useState<WeekDay>(today ?? "mon");
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [open, setOpen] = useState(!compact);

  const todayBlocks = useMemo(() => {
    if (!today) return [];
    return schedule
      .filter((item) => item.day === today)
      .slice()
      .sort((a, b) => a.start.localeCompare(b.start));
  }, [schedule, today]);

  const pinned = useMemo(
    () => schedule.filter((item) => item.pinned).slice(0, 4),
    [schedule],
  );

  const dayBlocks = useMemo(
    () =>
      schedule
        .filter((item) => item.day === day)
        .slice()
        .sort((a, b) => a.start.localeCompare(b.start)),
    [schedule, day],
  );

  function onAdd(event: FormEvent) {
    event.preventDefault();
    addScheduleBlock({ day, start, end, title, place });
    setTitle("");
    setPlace("");
  }

  const editor: ReactNode = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {WEEK_DAYS.map((item) => (
          <Chip
            key={item.id}
            active={day === item.id}
            pressed={day === item.id}
            onClick={() => setDay(item.id)}
          >
            {tr(lang, item)}
            {today === item.id ? " ·" : ""}
          </Chip>
        ))}
      </div>

      <form className="grid gap-2 sm:grid-cols-2" onSubmit={onAdd}>
        <label className="sm:col-span-2">
          <span className="sr-only">{tr(lang, { en: "Title", zh: "标题" })}</span>
          <Input
            value={title}
            maxLength={60}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={tr(lang, { en: "Class, practice, work…", zh: "课、训练、打工…" })}
          />
        </label>
        <label>
          <span className="mb-1 block text-xs text-muted">{tr(lang, { en: "Start", zh: "开始" })}</span>
          <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label>
          <span className="mb-1 block text-xs text-muted">{tr(lang, { en: "End", zh: "结束" })}</span>
          <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <label className="sm:col-span-2">
          <span className="sr-only">{tr(lang, { en: "Place", zh: "地点" })}</span>
          <Input
            value={place}
            maxLength={60}
            onChange={(e) => setPlace(e.target.value)}
            placeholder={tr(lang, { en: "Room or place (optional)", zh: "教室或地点（可选）" })}
          />
        </label>
        <Button type="submit" disabled={!title.trim() || schedule.length >= 40} className="sm:col-span-2">
          {tr(lang, { en: "Add to week", zh: "加到本周" })}
        </Button>
      </form>

      {dayBlocks.length === 0 ? (
        <EmptyState
          title={tr(lang, { en: "Nothing on this day", zh: "这一天还没有" })}
          body={tr(lang, {
            en: "Blocks stay in this browser. Pin the ones you want on Today.",
            zh: "课段只留在这台浏览器。想在今日看到的，钉一下。",
          })}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {dayBlocks.map((block) => (
            <li
              key={block.id}
              className="flex items-start gap-2 rounded-md border border-line bg-card px-3 py-2 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{block.title}</p>
                <p className="text-sm text-muted">
                  {block.start}–{block.end}
                  {block.place ? ` · ${block.place}` : ""}
                </p>
              </div>
              <button
                type="button"
                aria-pressed={block.pinned}
                aria-label={tr(lang, { en: "Show on Today", zh: "显示在今日" })}
                onClick={() => toggleSchedulePin(block.id)}
                className={cn(
                  "grid size-11 place-items-center rounded-md border",
                  block.pinned ? "border-moss bg-moss-soft text-moss" : "border-line text-muted",
                )}
              >
                <Pin className={cn("size-4", block.pinned && "fill-current")} aria-hidden />
              </button>
              <button
                type="button"
                aria-label={tr(lang, { en: "Remove", zh: "删除" })}
                onClick={() => removeScheduleBlock(block.id)}
                className="grid size-11 place-items-center rounded-md border border-line text-muted"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (compact) {
    const show = pinned.length > 0 ? pinned : todayBlocks.slice(0, 3);
    return (
      <Card className="flex flex-col gap-2">
        <SectionHeader
          kicker={tr(lang, { en: "Week", zh: "本周" })}
          title={tr(lang, { en: "Schedule", zh: "课表" })}
          action={
            <button type="button" onClick={() => setOpen((v) => !v)} className="text-sm text-moss">
              {open
                ? tr(lang, { en: "Hide", zh: "收起" })
                : tr(lang, { en: "Edit", zh: "编辑" })}
            </button>
          }
        />
        {show.length === 0 ? (
          <p className="text-sm text-muted">
            {tr(lang, {
              en: "Add Mon–Fri blocks. Pinned ones show up on Today.",
              zh: "加上周一到周五的课段。钉住的会出现在今日。",
            })}
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {show.map((block) => {
              const dayLabel = WEEK_DAYS.find((d) => d.id === block.day);
              return (
                <li
                  key={block.id}
                  className="flex items-baseline justify-between gap-2 rounded-md border border-line/80 bg-paper/60 px-2.5 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{block.title}</p>
                    <p className="text-xs text-muted">
                      {dayLabel ? tr(lang, dayLabel) : block.day} · {block.start}–{block.end}
                      {block.place ? ` · ${block.place}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {open ? editor : null}
      </Card>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <SectionHeader
        kicker={tr(lang, { en: "On this device only", zh: "只在这台设备" })}
        title={tr(lang, { en: "Week schedule", zh: "一周课表" })}
      />
      {editor}
    </section>
  );
}
