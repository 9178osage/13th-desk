import { Check, ExternalLink } from "lucide-react";
import { deadlinesFor, k12Checks, k12Links, releaseLine } from "@/data/k12";
import { cn } from "@/lib/cn";
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
  const clock = eugeneClock();
  const checks = useDesk((state) => state.buckets[state.level].checks);
  const toggleCheck = useDesk((state) => state.toggleCheck);
  const list = k12Checks[level];
  const done = list.filter((item) => checks.includes(item.id)).length;
  const dates = deadlinesFor(level);
  const name = LEVELS.find((item) => item.id === level);
  const links = k12Links.filter((item) => level === "high" || !item.href.includes("studentaid") && !item.href.includes("oregonstudentaid"));

  return (
    <div className="flex flex-col gap-12">
      <header className="border-b border-ink pb-4">
        <p className="text-xs uppercase tracking-widest text-muted">
          {name ? tr(lang, name) : ""}
        </p>
        <h1 className="mt-1 font-display text-4xl text-ink md:text-5xl">
          {tr(lang, { en: "The year", zh: "这一年" })}
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          {tr(lang, {
            en: "Dates below are Eugene 4J for 2026–27. Bethel and Springfield print their own. The checklist stays in this browser.",
            zh: "下面的日期是尤金 4J 学区 2026–27。Bethel 和 Springfield 有自己的校历。清单只存在这台浏览器里。",
          })}
        </p>
        <p className="mt-3 max-w-2xl text-sm text-ink">{tr(lang, releaseLine(level, clock.weekday === 3))}</p>
      </header>

      <section>
        <h2 className="font-display text-3xl text-ink">
          {tr(lang, { en: "Days off", zh: "不上课的日子" })}
        </h2>
        <ol className="mt-4 divide-y divide-line border-y border-line">
          {dates.map((item) => {
            const past = isPast(item, clock);
            return (
              <li key={item.id} className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
                <p className={cn("font-display text-lg", past ? "text-muted" : "text-ink")}>
                  {past
                    ? tr(lang, { en: "Passed", zh: "已过" })
                    : formatWhen(item.ymd, clock.ymd, lang)}
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
