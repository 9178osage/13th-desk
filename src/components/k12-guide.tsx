import { useClock } from "@/lib/use-clock";
import { Check, ExternalLink } from "lucide-react";
import { k12Checks, k12Links, releaseLine } from "@/data/k12";
import { cn } from "@/lib/cn";
import {
  k12CalendarSource,
  k12DeadlinesForDistrict,
  k12DatesExpired,
} from "@/lib/calendar";
import { deskText as c } from "@/lib/desk-copy";
import { LEVELS, type Level } from "@/lib/levels";
import { useDesk, useLang } from "@/lib/store";
import { tr } from "@/lib/text";
import { eugeneClock, formatWhen, hmToMin } from "@/lib/time";

function isPast(item: { ymd: string; time?: string }, clock: ReturnType<typeof eugeneClock>) {
  if (item.ymd > clock.ymd) return false;
  if (item.ymd < clock.ymd) return true;
  if (!item.time) return false;
  return clock.minutes >= hmToMin(item.time);
}

export function K12Guide({ level }: { level: Exclude<Level, "uni"> }) {
  const lang = useLang();
  const now = useClock();
  const clock = now ? eugeneClock(now) : null;
  const district = useDesk((state) => state.district);
  const checks = useDesk((state) => state.buckets[state.level].checks);
  const toggleCheck = useDesk((state) => state.toggleCheck);
  const list = k12Checks[level];
  const done = list.filter((item) => checks.includes(item.id)).length;
  const source = k12CalendarSource(district);
  const dates = k12DeadlinesForDistrict(level, district);
  const expired = clock ? k12DatesExpired(level, district, clock) : false;
  const name = LEVELS.find((item) => item.id === level);
  const links = k12Links.filter(
    (item) =>
      level === "high" ||
      (!item.href.includes("studentaid") && !item.href.includes("oregonstudentaid")),
  );

  return (
    <div className="flex flex-col gap-12">
      <header className="border-b border-ink pb-4">
        <p className="text-xs uppercase tracking-widest text-muted">{name ? tr(lang, name) : ""}</p>
        <h1 className="mt-1 font-display text-4xl text-ink md:text-5xl">
          {tr(lang, { en: "The year", zh: "学年指南" })}
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          {tr(lang, {
            en: "Personal checklist stays in this browser. Calendar rows are only stored for districts we have verified dates for.",
            zh: "个人清单保存在当前浏览器。校历日期仅收录我们已核对过的学区。",
          })}
        </p>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          {source.hasMatchingData
            ? c(lang, "calendarSource", { name: tr(lang, source.name) })
            : c(lang, "calendarSourcePlain")}
          {source.href ? (
            <>
              {" · "}
              <a
                href={source.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-moss underline"
              >
                {c(lang, "officialCalendar")}
              </a>
            </>
          ) : null}
        </p>
        <p className="mt-3 max-w-2xl text-sm text-ink">
          {tr(lang, releaseLine(level, clock?.weekday === 3))}
        </p>
      </header>

      <section>
        <h2 className="font-display text-3xl text-ink">
          {tr(lang, { en: "Days off", zh: "假期与休课日" })}
        </h2>
        {!source.hasMatchingData ? (
          <p className="mt-4 rounded-lg border border-line bg-card p-4 text-sm text-muted">
            {c(lang, "noDistrictDates")}{" "}
            {source.href ? (
              <a
                href={source.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-moss underline"
              >
                {c(lang, "officialCalendar")}
              </a>
            ) : null}
          </p>
        ) : expired ? (
          <p className="mt-4 rounded-lg border border-line bg-card p-4 text-sm text-muted">
            {c(lang, "termExpired")}{" "}
            {source.href ? (
              <a
                href={source.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-moss underline"
              >
                {c(lang, "officialCalendar")}
              </a>
            ) : null}
          </p>
        ) : (
          <ol className="mt-4 divide-y divide-line border-y border-line">
            {dates.map((item) => {
              const past = clock ? isPast(item, clock) : false;
              return (
                <li key={item.id} className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
                  <p className={cn("font-display text-lg", past ? "text-muted" : "text-ink")}>
                    {past
                      ? tr(lang, { en: "Passed", zh: "已过" })
                      : formatWhen(item.ymd, clock?.ymd ?? "", lang)}
                  </p>
                  <div>
                    <p className={cn("font-medium", past ? "text-muted" : "text-ink")}>
                      {tr(lang, item.title)}
                    </p>
                    <p className="text-sm text-muted">{tr(lang, item.detail)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-3xl text-ink">
            {tr(lang, { en: "This month", zh: "这个月要做的" })}
          </h2>
          <p className="text-sm tabular-nums text-muted">
            {done} / {list.length}
          </p>
        </div>
        <ul className="mt-4 flex flex-col gap-2">
          {list.map((item) => {
            const on = checks.includes(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleCheck(item.id)}
                  className="flex w-full items-start gap-3 rounded-lg border border-line bg-card px-4 py-3 text-left"
                >
                  <span
                    className={cn(
                      "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border",
                      on ? "border-moss bg-moss text-card" : "border-line",
                    )}
                  >
                    {on ? <Check className="size-3.5" aria-hidden /> : null}
                  </span>
                  <span className={cn("text-sm", on ? "text-muted line-through" : "text-ink")}>
                    {tr(lang, item.label)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-3xl text-ink">
          {tr(lang, { en: "Districts", zh: "学区" })}
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {links.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 flex-col justify-center rounded-lg border border-line bg-card px-4 py-3"
              >
                <span className="inline-flex items-center gap-1 font-medium text-ink">
                  {tr(lang, item.label)}
                  <ExternalLink className="size-4 text-moss" aria-hidden />
                </span>
                <span className="text-sm text-muted">{tr(lang, item.note)}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
