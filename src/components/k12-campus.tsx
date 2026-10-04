import { useClock } from "@/lib/use-clock";
import { ExternalLink } from "lucide-react";
import {
  elemBells,
  elemSchools,
  highSchoolCards,
  midSchools,
  releaseLine,
  type SchoolCard,
} from "@/data/k12";
import { Card, Chip, SectionHeader } from "@/components/ui";
import type { Level } from "@/lib/levels";
import { LEVELS } from "@/lib/levels";
import { useLang } from "@/lib/store";
import { tr } from "@/lib/text";
import { eugeneClock } from "@/lib/time";

function districtLabel(district: SchoolCard["district"], lang: ReturnType<typeof useLang>) {
  if (district === "bethel") return tr(lang, { en: "Bethel", zh: "Bethel" });
  if (district === "4j") return tr(lang, { en: "4J", zh: "4J" });
  return tr(lang, { en: "Other", zh: "其他" });
}

function SchoolGrid({ schools }: { schools: SchoolCard[] }) {
  const lang = useLang();
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {schools.map((school) => (
        <li key={school.id}>
          <Card className="lift-hover flex h-full flex-col gap-2">
            <div className="flex flex-wrap gap-1.5">
              <Chip>{districtLabel(school.district, lang)}</Chip>
              {school.bellGroup ? (
                <Chip>
                  {school.bellGroup === "early"
                    ? tr(lang, { en: "Earlier schedule", zh: "较早作息" })
                    : tr(lang, { en: "Later schedule", zh: "较晚作息" })}
                </Chip>
              ) : null}
            </div>
            <h3 className="font-display text-2xl text-ink">{school.name}</h3>
            {school.bell ? (
              <p className="text-sm font-medium text-ink">{tr(lang, school.bell)}</p>
            ) : null}
            {school.wed ? <p className="text-sm text-moss">{tr(lang, school.wed)}</p> : null}
            {school.note ? <p className="text-sm text-muted">{tr(lang, school.note)}</p> : null}
            {school.href ? (
              <a
                href={school.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto inline-flex min-h-11 items-center gap-1 text-sm text-moss"
              >
                {tr(lang, { en: "District site", zh: "学区网站" })}
                <ExternalLink className="size-4" aria-hidden />
              </a>
            ) : null}
          </Card>
        </li>
      ))}
    </ul>
  );
}

export function K12Campus({ level }: { level: Exclude<Level, "uni"> }) {
  const lang = useLang();
  const now = useClock();
  const clock = now ? eugeneClock(now) : null;
  const name = LEVELS.find((item) => item.id === level);
  const label = name ? tr(lang, name) : "";

  return (
    <div className="flex flex-col gap-8">
      <header className="border-b border-ink/80 pb-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
          {tr(lang, { en: "Eugene public schools", zh: "尤金的公立学校" })}
        </p>
        <h1 className="mt-1 font-display text-4xl text-ink md:text-5xl">{label}</h1>
        <p className="mt-3 max-w-2xl text-muted">
          {tr(lang, releaseLine(level, clock?.weekday === 3))}
        </p>
      </header>

      {level === "elem" ? (
        <>
          <section className="flex flex-col gap-3">
            <SectionHeader
              kicker={tr(lang, { en: "Schedule groups", zh: "作息分组" })}
              title={tr(lang, { en: "Two Wednesday dismissal times", zh: "两种周三放学时间" })}
            />
            <div className="grid gap-3 md:grid-cols-2">
              {elemBells.map((group) => (
                <Card key={group.id} tone="gold">
                  <p className="font-display text-2xl text-ink">{tr(lang, group.time)}</p>
                  <p className="mt-1 text-sm text-moss">{tr(lang, group.wed)}</p>
                  <p className="mt-2 text-xs text-muted">
                    {group.schools.length}{" "}
                    {tr(lang, { en: "schools on this schedule", zh: "所学校用这组时间" })}
                  </p>
                </Card>
              ))}
            </div>
          </section>
          <section className="flex flex-col gap-3">
            <SectionHeader title={tr(lang, { en: "Schools", zh: "学校" })} />
            <SchoolGrid schools={elemSchools} />
          </section>
        </>
      ) : level === "mid" ? (
        <section className="flex flex-col gap-3">
          <SectionHeader title={tr(lang, { en: "Middle schools", zh: "初中" })} />
          <SchoolGrid schools={midSchools} />
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          <SectionHeader title={tr(lang, { en: "High schools", zh: "高中" })} />
          <SchoolGrid schools={highSchoolCards} />
        </section>
      )}

      <p className="max-w-2xl text-sm text-muted">
        {level === "elem"
          ? tr(lang, {
              en: "Family School shares Camas Ridge’s building this year, on the earlier bell. Buena Vista is Spanish immersion, Charlemagne French, Yujin Gakuen Japanese. This is not every 4J elementary — the district list is.",
              zh: "Family School 今年和 Camas Ridge 用同一栋楼，上课时间更早。Buena Vista 是西班牙语沉浸班，Charlemagne 是法语沉浸班，Yujin Gakuen 是日语沉浸班。这里不是尤金 4J 学区的全部小学，完整名单在学区网站。",
            })
          : level === "mid"
            ? tr(lang, {
                en: "Roosevelt through Arts & Technology are 4J. Cascade is Bethel. Shasta closed this fall; don’t navigate to the old building.",
                zh: "Roosevelt 到 Arts & Technology 属于尤金 4J 学区。Cascade 属于 Bethel 学区。Shasta 今年秋天停办了，别再按旧地址过去。",
              })
            : tr(lang, {
                en: "South, Sheldon, Churchill, and North are 4J. International High School is a program inside those four, not a fifth building. Willamette and Kalapuya are Bethel.",
                zh: "South、Sheldon、Churchill、North 属于尤金 4J 学区。International High School 是这四所学校里的项目，不是另一栋教学楼。Willamette 和 Kalapuya 属于 Bethel 学区。",
              })}
      </p>
      <a
        href="https://www.4j.lane.edu/calendars"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-moss"
      >
        {tr(lang, { en: "4J calendar and bells", zh: "4J 学区校历和作息" })}
        <ExternalLink className="size-4" aria-hidden />
      </a>
    </div>
  );
}
