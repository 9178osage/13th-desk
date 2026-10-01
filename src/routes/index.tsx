import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Trash2 } from "lucide-react";
import { deadlines } from "@/data/guide";
import { deadlinesFor, releaseLine } from "@/data/k12";
import { areaName, forLevel, places } from "@/data/places";
import { WeatherCard } from "@/components/weather";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { LEVELS } from "@/lib/levels";
import { tf, tr } from "@/lib/text";
import { useDesk, useLang } from "@/lib/store";
import {
  K12_EARLY,
  K12_END,
  K12_START,
  eugeneClock,
  formatDateline,
  formatWhen,
  hmToMin,
  spanPhase,
  termPhase,
} from "@/lib/time";

export const Route = createFileRoute("/")({
  component: Home,
});

function passed(item: (typeof deadlines)[number], clock: ReturnType<typeof eugeneClock>) {
  return deadlinePassedLike(item, clock);
}

function deadlinePassedLike(
  item: { ymd: string; time?: string },
  clock: ReturnType<typeof eugeneClock>,
) {
  if (item.ymd > clock.ymd) return false;
  if (item.ymd < clock.ymd) return true;
  if (!item.time) return false;
  return clock.minutes >= hmToMin(item.time);
}

function Home() {
  const lang = useLang();
  const level = useDesk((state) => state.level);
  const earlyStart = useDesk((state) => state.earlyStart);
  const setEarlyStart = useDesk((state) => state.setEarlyStart);
  const district = useDesk((state) => state.district);
  const clock = eugeneClock();
  const phase =
    level === "uni"
      ? termPhase(clock.ymd)
      : spanPhase(clock.ymd, earlyStart ? K12_EARLY : K12_START, K12_END);
  const notes = useDesk((state) => state.buckets[state.level].notes);
  const favs = useDesk((state) => state.buckets[state.level].favs);
  const addNote = useDesk((state) => state.addNote);
  const toggleNote = useDesk((state) => state.toggleNote);
  const removeNote = useDesk((state) => state.removeNote);
  const [draft, setDraft] = useState("");

  const dateList = level === "uni" ? deadlines : deadlinesFor(level);
  const upcoming = dateList.filter((item) => !passed(item, clock)).slice(0, 3);
  const pins = places.filter((place) => favs.includes(place.id) && forLevel(place, level)).slice(0, 4);
  const levelName = LEVELS.find((item) => item.id === level);

  const greet =
    clock.hour < 5
      ? tr(lang, { en: "Still up", zh: "还醒着" })
      : clock.hour < 12
        ? tr(lang, { en: "Morning", zh: "早" })
        : clock.hour < 17
          ? tr(lang, { en: "Afternoon", zh: "下午好" })
          : tr(lang, { en: "Evening", zh: "晚上好" });

  let termLine = tr(lang, {
    en: level === "uni"
      ? "Fall term has finished. The registrar has the next calendar."
      : "The school year ended June 16. Next year’s dates are on the district site.",
    zh: level === "uni"
      ? "秋季学期结束了。下一份校历在教务处网站。"
      : "这学年 6 月 16 日结束了。明年的日期在学区网站。",
  });
  if (phase.kind === "before") {
    termLine =
      level === "uni"
        ? tf(lang, {
            en: "Fall classes start September 28 — {n} days out.",
            zh: "秋季 9 月 28 日开学，还有 {n} 天。",
          }, { n: phase.daysUntil })
        : earlyStart
          ? tf(
              lang,
              {
                en: "Kindergarten, 6th, and 9th start September 8 — {n} days out.",
                zh: "幼儿园、六年级、九年级 9 月 8 日开学，还有 {n} 天。",
                es: "Kínder, 6.º y 9.º empiezan el 8 de septiembre — faltan {n} días.",
                ko: "유치원, 6학년, 9학년은 9월 8일에 시작해요. {n}일 남았어요.",
                vi: "Mẫu giáo, lớp 6 và lớp 9 khai giảng ngày 8 tháng 9 — còn {n} ngày.",
                ja: "幼稚園、6年生、9年生は9月8日に始まります。あと {n} 日です。",
              },
              { n: phase.daysUntil },
            )
          : tf(lang, {
              en: "Most 4J students start September 9 — {n} days out. Kindergarten, 6th, and 9th start September 8.",
              zh: "4J 多数学生 9 月 9 日开学，还有 {n} 天。幼儿园、六年级、九年级是 9 月 8 日。",
            }, { n: phase.daysUntil });
  } else if (phase.kind === "during") {
    if (level === "uni") {
      const beat =
        phase.day === 1
          ? tr(lang, { en: "Classes begin today.", zh: "今天开学。" })
          : phase.day === 2
            ? tr(lang, { en: "Classes began yesterday.", zh: "昨天已经开学。" })
            : tr(lang, { en: "Term is underway.", zh: "这学期已经开始了。" });
      termLine = tf(
        lang,
        {
          en: "Fall, day {day} · week {week}. {beat}",
          zh: "秋季第 {day} 天 · 第 {week} 周。{beat}",
        },
        { day: phase.day, week: phase.week, beat },
      );
    } else {
      const off =
        clock.weekday === 0 || clock.weekday === 6
          ? tr(lang, { en: "No school today.", zh: "今天不上课。" })
          : tr(lang, { en: "School is in session.", zh: "今天要上课。" });
      termLine = tf(
        lang,
        earlyStart
          ? {
              en: "Day {day} since September 8 · week {week}. {off}",
              zh: "从 9 月 8 日算起第 {day} 天 · 第 {week} 周。{off}",
              es: "Día {day} desde el 8 de septiembre · semana {week}. {off}",
              ko: "9월 8일부터 {day}일째예요 · {week}주차. {off}",
              vi: "Ngày {day} kể từ 8 tháng 9 · tuần {week}. {off}",
              ja: "9月8日から{day}日目 · 第{week}週。{off}",
            }
          : {
              en: "Day {day} since September 9 · week {week}. {off}",
              zh: "从 9 月 9 日算起第 {day} 天 · 第 {week} 周。{off}",
            },
        { day: phase.day, week: phase.week, off },
      );
    }
  }

  const sat = (6 - clock.weekday + 7) % 7;
  const inSeason = clock.month >= 4 && clock.month <= 11;
  let market = tr(lang, {
    en: "The outdoor market sleeps most of the winter. 5th Street Public Market still works when it is wet.",
    zh: "户外市集冬天大多休息。下雨时第五街公共市场还开着。",
  });
  if (clock.month === 12) {
    market = tr(lang, {
      en: "December is sometimes a holiday market and sometimes not. Check before you go.",
      zh: "十二月有时有节日市集，有时没有。去之前先确认。",
    });
  } else if (inSeason && sat === 0) {
    market = tr(lang, {
      en: "It is on today. Park Blocks, about 10 to 4.",
      zh: "今天有市集。在 Park Blocks，大约 10 点到 4 点。",
    });
  } else if (inSeason) {
    market = tf(
      lang,
      sat === 1
        ? {
            en: "1 day until Saturday. Park Blocks, about 10 to 4.",
            zh: "离周六还有 1 天。在 Park Blocks，大约 10 点到 4 点。",
          }
        : {
            en: "{n} days until Saturday. Park Blocks, about 10 to 4.",
            zh: "离周六还有 {n} 天。在 Park Blocks，大约 10 点到 4 点。",
          },
      { n: sat },
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="border-b border-ink pb-6" suppressHydrationWarning>
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-muted">
              {formatDateline(new Date(), lang)}
              {levelName ? ` · ${tr(lang, levelName)}` : ""}
            </p>
            <h1 className="mt-2 font-display text-4xl text-ink md:text-6xl">{greet}</h1>
          </div>
          {phase.kind === "during" ? (
            <p className="shrink-0 text-right font-display text-5xl leading-none tabular-nums text-moss md:text-6xl">
              {String(phase.day).padStart(2, "0")}
              <span className="mt-1 block text-xs font-sans uppercase tracking-widest text-muted">
                {level === "uni"
                  ? tr(lang, { en: "Fall day", zh: "秋季第几天" })
                  : earlyStart
                    ? tr(lang, {
                        en: "Since Sept 8",
                        zh: "从 9 月 8 日算",
                        es: "Desde el 8 de sept.",
                        ko: "9월 8일부터",
                        vi: "Từ 8 tháng 9",
                        ja: "9月8日から",
                      })
                    : tr(lang, { en: "Since Sept 9", zh: "从 9 月 9 日算" })}
              </span>
            </p>
          ) : null}
        </div>
        <p className="mt-3 max-w-xl text-base text-ink md:text-lg">{termLine}</p>
          {level !== "uni" ? (
            <p className="mt-2 max-w-xl text-sm text-muted">
              {tr(lang, releaseLine(level, clock.weekday === 3))}
            </p>
          ) : null}
          {level !== "uni" && phase.kind !== "after" && (district === null || district === "4j") ? (
            <button
              type="button"
              aria-pressed={earlyStart}
              onClick={() => setEarlyStart(!earlyStart)}
              className="mt-3 inline-flex min-h-11 max-w-xl items-center rounded-md border border-line bg-card px-3 py-2 text-left text-sm text-ink"
            >
              {earlyStart
                ? tr(lang, {
                    en: "Counting from September 8. Most students started September 9.",
                    zh: "正在按 9 月 8 日算。多数学生是 9 月 9 日开学。",
                    es: "Contando desde el 8 de septiembre. La mayoría empezó el 9.",
                    ko: "9월 8일부터 세고 있어요. 대부분은 9월 9일에 시작해요.",
                    vi: "Đang tính từ ngày 8 tháng 9. Hầu hết khai giảng ngày 9 tháng 9.",
                    ja: "9月8日から数えています。ほとんどの生徒は9月9日です。",
                  })
                : tr(lang, {
                    en: "Kindergarten, 6th, and 9th started September 8. Count from that day.",
                    zh: "幼儿园、六年级、九年级是 9 月 8 日开学。按那天算。",
                    es: "Kínder, 6.º y 9.º empezaron el 8 de septiembre. Contar desde ese día.",
                    ko: "유치원, 6학년, 9학년은 9월 8일에 시작해요. 그 날부터 세요.",
                    vi: "Mẫu giáo, lớp 6 và lớp 9 khai giảng ngày 8 tháng 9. Tính từ ngày đó.",
                    ja: "幼稚園、6年生、9年生は9月8日です。その日から数えます。",
                  })}
            </button>
          ) : null}
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-5">
        <div className="order-2 flex flex-col gap-8 lg:order-1 lg:col-span-3">
          <section>
            <h2 className="font-display text-3xl text-ink">
              {tr(lang, { en: "Due soon", zh: "快到的日子" })}
            </h2>
            {upcoming.length === 0 ? (
              <p className="mt-3 text-muted">
                {level === "uni"
                  ? tr(lang, {
                      en: "Nothing from the fall list is still ahead. Check the registrar before you trust a screenshot.",
                      zh: "秋季这张清单里，还没到的日期已经没有了。别拿截图当校历，去教务处看。",
                    })
                  : tr(lang, {
                      en: "Nothing left on this 4J list. The district PDF is newer than a screenshot.",
                      zh: "这张 4J 清单里，还没到的日期已经没有了。学区 PDF 比截图新，以 PDF 为准。",
                    })}
              </p>
            ) : (
              <ol className="mt-3 divide-y divide-line border-y border-line">
                {upcoming.map((item, index) => (
                  <li
                    key={item.id}
                    className={cn(
                      "grid gap-1 py-3 sm:grid-cols-[8rem_1fr] sm:gap-4",
                      index === 0 && "-mx-3 bg-gold-soft px-3",
                    )}
                  >
                    <p className="font-display text-lg text-ink">
                      {formatWhen(item.ymd, clock.ymd, lang)}
                    </p>
                    <div>
                      <p className="font-medium text-ink">{tr(lang, item.title)}</p>
                      <p className="text-sm text-muted">{tr(lang, item.detail)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <Link to="/guide" className="mt-3 inline-flex min-h-11 items-center text-sm text-moss">
              {level === "uni"
                ? tr(lang, { en: "Full fall list", zh: "整张秋季清单" })
                : tr(lang, { en: "The whole year", zh: "全年的日子" })}
            </Link>
          </section>

          <section>
            <h2 className="font-display text-3xl text-ink">
              {tr(lang, { en: "On this desk", zh: "笔记" })}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {tr(lang, { en: "Kept in this browser only.", zh: "只存在这台浏览器里。" })}
            </p>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                addNote(draft);
                setDraft("");
              }}
            >
              <label className="min-w-0 flex-1">
                <span className="sr-only">{tr(lang, { en: "Note", zh: "笔记" })}</span>
                <input
                  value={draft}
                  maxLength={140}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={
                    level === "elem"
                      ? tr(lang, { en: "Picture day, library book, pickup change", zh: "拍照日、图书馆的书、换人接" })
                      : level === "uni"
                        ? tr(lang, { en: "Textbook, ISSS appointment, call home", zh: "教材、ISSS 预约、给家里打电话" })
                        : tr(lang, { en: "Practice, permission slip, project", zh: "训练、家长签名、作业" })
                  }
                  className="min-h-11 w-full rounded-md border border-line bg-card px-3 text-ink placeholder:text-muted"
                />
              </label>
              <Button type="submit" disabled={!draft.trim() || notes.length >= 20}>
                {tr(lang, { en: "Save note", zh: "记下" })}
              </Button>
            </form>
            {notes.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                {tr(lang, { en: "The desk is clear.", zh: "还没有笔记。" })}
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {notes.map((note) => (
                  <li key={note.id} className="flex items-start gap-2">
                    <button
                      type="button"
                      aria-pressed={note.done}
                      onClick={() => toggleNote(note.id)}
                      className="flex min-h-11 flex-1 items-start gap-3 rounded-md border border-line bg-card px-3 py-2 text-left"
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border",
                          note.done ? "border-moss bg-moss text-card" : "border-line",
                        )}
                      >
                        {note.done ? <Check className="size-3" aria-hidden /> : null}
                      </span>
                      <span className={cn("text-sm break-words", note.done ? "text-muted" : "text-ink")}>
                        {note.text}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeNote(note.id)}
                      aria-label={tr(lang, { en: "Remove note", zh: "删除" })}
                      className="grid size-11 shrink-0 place-items-center rounded-md border border-line bg-card text-muted"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="order-1 flex flex-col gap-4 lg:order-2 lg:col-span-2">
          <WeatherCard />
          <section className="rounded-lg bg-moss p-4 text-card">
            <p className="text-xs uppercase tracking-widest">Saturday Market</p>
            <h2 className="mt-1 font-display text-3xl">
              {tr(lang, { en: "Park Blocks", zh: "Park Blocks" })}
            </h2>
            <p className="mt-2 text-sm">{market}</p>
            <a
              href="https://eugenesaturdaymarket.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-11 items-center text-sm underline"
            >
              {tr(lang, { en: "This week's market", zh: "看这周开不开" })}
            </a>
          </section>
          <section>
            <h2 className="font-display text-2xl text-ink">
              {tr(lang, { en: "Pinned", zh: "收藏" })}
            </h2>
            {pins.length === 0 ? (
              <p className="mt-2 text-sm text-muted">
                {level === "uni"
                  ? tr(lang, {
                      en: "Pin the rooms you actually use. They stay on this desk.",
                      zh: "把你会去的地方收藏起来。它们会留在这里。",
                    })
                  : tr(lang, {
                      en: "Save the places you actually go. They stay in this browser.",
                      zh: "把你会去的地方收藏起来。它们只留在这台浏览器里。",
                      es: "Guarda los lugares a los que sí vas. Se quedan en este navegador.",
                      ko: "실제로 가는 장소를 저장해요. 이 브라우저에만 남아요.",
                      vi: "Lưu những chỗ bạn thật sự hay đến. Chỉ ở trên trình duyệt này.",
                      ja: "本当に行く場所を保存してください。このブラウザにだけ残ります。",
                    })}
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {pins.map((place) => (
                  <li key={place.id} className="rounded-md border border-line bg-card px-3 py-2">
                    <p className="text-xs uppercase tracking-widest text-muted">
                      {tr(lang, areaName[place.area])}
                    </p>
                    <p className="font-medium text-ink">{place.name}</p>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/campus" className="mt-2 inline-flex min-h-11 items-center text-sm text-moss">
              {level === "uni"
                ? tr(lang, { en: "Campus list", zh: "校园清单" })
                : tr(lang, {
                    en: "School list",
                    zh: "学校名单",
                    es: "Lista de escuelas",
                    ko: "학교 목록",
                    vi: "Danh sách trường",
                    ja: "学校一覧",
                  })}
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
