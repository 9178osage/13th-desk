import { createFileRoute } from "@tanstack/react-router";
import { Check, ExternalLink } from "lucide-react";
import {
  around,
  arrival,
  checklist,
  deadlines,
  helpLinks,
  neighborhoods,
  schools,
} from "@/data/guide";
import { K12Guide } from "@/components/k12-guide";
import { cn } from "@/lib/cn";
import { useDesk, useLang } from "@/lib/store";
import { tr } from "@/lib/text";
import { eugeneClock, formatWhen, hmToMin } from "@/lib/time";

export const Route = createFileRoute("/guide")({
  head: () => ({ meta: [{ title: "Guide · Eugene Desk" }] }),
  component: GuidePage,
});

function isPast(item: { ymd: string; time?: string }, clock: ReturnType<typeof eugeneClock>) {
  if (item.ymd > clock.ymd) return false;
  if (item.ymd < clock.ymd) return true;
  if (!item.time) return false;
  return clock.minutes >= hmToMin(item.time);
}

function GuidePage() {
  const level = useDesk((state) => state.level);
  if (level !== "uni") return <K12Guide level={level} />;
  return <UniGuide />;
}

function UniGuide() {
  const lang = useLang();
  const clock = eugeneClock();
  const checks = useDesk((state) => state.buckets[state.level].checks);
  const toggleCheck = useDesk((state) => state.toggleCheck);
  const done = checklist.filter((item) => checks.includes(item.id)).length;

  return (
    <div className="flex flex-col gap-12">
      <header className="border-b border-ink pb-4">
        <p className="text-xs uppercase tracking-widest text-muted">
          {tr(lang, { en: "For students in Eugene", zh: "写给在尤金上学的人" })}
        </p>
        <h1 className="mt-1 font-display text-4xl text-ink md:text-5xl">
          {tr(lang, { en: "The guide", zh: "指南" })}
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          {tr(lang, {
            en: "University of Oregon and Lane Community College. Dates below are fall 2026 UO. Your checklist stays in this browser.",
            zh: "俄勒冈大学和莱恩社区学院。下面是 2026 秋季 UO 校历。清单只存在这台浏览器里。",
          })}
        </p>
      </header>

      <section>
        <h2 className="font-display text-3xl text-ink">
          {tr(lang, { en: "Two schools", zh: "两所学校" })}
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {schools.map((school) => (
            <article key={school.name} className="rounded-lg border border-line bg-card p-4">
              <h3 className="font-display text-2xl text-ink">{school.name}</h3>
              <p className="mt-2 text-sm text-muted">{tr(lang, school.body)}</p>
              <a
                href={school.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm text-moss"
              >
                {tr(lang, { en: "Official site", zh: "官网" })}
                <ExternalLink className="size-4" aria-hidden />
              </a>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-3xl text-ink">
          {tr(lang, { en: "Fall 2026", zh: "2026 秋季" })}
        </h2>
        <ol className="mt-4 divide-y divide-line border-y border-line">
          {deadlines.map((item) => {
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
        <a
          href="https://registrar.uoregon.edu/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm text-moss"
        >
          {tr(lang, { en: "Check with the registrar", zh: "去教务处核对" })}
          <ExternalLink className="size-4" aria-hidden />
        </a>
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-3xl text-ink">
            {tr(lang, { en: "First ten days", zh: "开学头十天" })}
          </h2>
          <p className="text-sm tabular-nums text-muted">
            {done} / {checklist.length}
          </p>
        </div>
        <ul className="mt-4 flex flex-col gap-2">
          {checklist.map((item) => {
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
          {tr(lang, { en: "Getting around", zh: "怎么走" })}
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {around.map((item) => (
            <article key={item.title.en} className="rounded-lg border border-line bg-card p-4">
              <h3 className="font-display text-xl text-ink">{tr(lang, item.title)}</h3>
              <p className="mt-2 text-sm text-muted">{tr(lang, item.body)}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-3xl text-ink">
          {tr(lang, { en: "Where people live", zh: "住在哪" })}
        </h2>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {neighborhoods.map((item) => (
            <li key={item.name} className="grid gap-1 py-3 sm:grid-cols-[11rem_1fr] sm:gap-4">
              <h3 className="font-medium text-ink">{lang === "zh" ? item.zh : item.name}</h3>
              <p className="text-sm text-muted">{tr(lang, item.body)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-line bg-card p-4">
        <h2 className="font-display text-3xl text-ink">
          {tr(lang, { en: "Just got here", zh: "刚到尤金" })}
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-muted">{tr(lang, arrival)}</p>
      </section>

      <section>
        <h2 className="font-display text-3xl text-ink">
          {tr(lang, { en: "Who to ask", zh: "该找谁" })}
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {helpLinks.map((item) => (
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

      <p className="text-sm text-muted">
        {tr(lang, {
          en: "Fall dates come from the UO 2026–27 catalog and the registrar. Bus rules, library hours, and market days change. Check the official site before you bet a grade on a card.",
          zh: "秋季日期来自俄勒冈大学 2026–27 校历和教务处。公交、图书馆和市集时间会变。别拿这页当正式依据，去官网核对。",
        })}
      </p>
    </div>
  );
}
