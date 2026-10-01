import { ExternalLink } from "lucide-react";
import { elemBells, highSchools, middleSchools, releaseLine } from "@/data/k12";
import type { Level } from "@/lib/levels";
import { LEVELS } from "@/lib/levels";
import { useLang } from "@/lib/store";
import { tr } from "@/lib/text";
import { eugeneClock } from "@/lib/time";

export function K12Campus({ level }: { level: Exclude<Level, "uni"> }) {
  const lang = useLang();
  const clock = eugeneClock();
  const name = LEVELS.find((item) => item.id === level);
  const label = name ? tr(lang, name) : "";

  return (
    <div className="flex flex-col gap-8">
      <header className="border-b border-ink pb-4">
        <p className="text-xs uppercase tracking-widest text-muted">
          {tr(lang, { en: "Eugene public schools", zh: "尤金的公立学校" })}
        </p>
        <h1 className="mt-1 font-display text-4xl text-ink md:text-5xl">{label}</h1>
        <p className="mt-3 max-w-2xl text-muted">
          {tr(lang, releaseLine(level, clock.weekday === 3))}
        </p>
      </header>

      {level === "elem" ? (
        <div className="grid gap-3 md:grid-cols-2">
          {elemBells.map((group) => (
            <section key={group.id} className="rounded-lg border border-line bg-card p-4">
              <p className="font-display text-2xl text-ink">{tr(lang, group.time)}</p>
              <p className="mt-1 text-sm text-moss">{tr(lang, group.wed)}</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {group.schools.map((school) => (
                  <li key={school} className="rounded-full border border-line px-3 py-2 text-sm text-ink">
                    {school}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <section className="rounded-lg border border-line bg-card p-4">
          <ul className="flex flex-wrap gap-2">
            {(level === "mid" ? middleSchools : highSchools).map((school) => (
              <li key={school} className="rounded-full border border-line px-3 py-2 text-sm text-ink">
                {school}
              </li>
            ))}
          </ul>
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
