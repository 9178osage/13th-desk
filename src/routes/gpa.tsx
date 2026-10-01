import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui";
import {
  LETTERS,
  combinedGpa,
  creditChoices,
  defaultCredits,
  formatCredits,
  formatGpa,
  listGpa,
  parseCredits,
  parseGpaInput,
  type GpaFigure,
  type GpaInput,
} from "@/lib/gpa";
import type { Level } from "@/lib/levels";
import type { GradeRow } from "@/lib/store";
import { useDesk, useLang } from "@/lib/store";
import { tr, type Copy, type Lang } from "@/lib/text";

export const Route = createFileRoute("/gpa")({
  head: () => ({ meta: [{ title: "GPA · 13th Desk" }] }),
  component: GpaPage,
});

const INTRO: Record<Level, Copy> = {
  uni: {
    en: "University of Oregon and Lane Community College: points divided by graded credits. A+ is 4.3. Pass and no-pass stay out. This is an estimate. The transcript is the real number.",
    zh: "按俄勒冈大学和莱恩社区学院的算法：成绩点数 ÷ 计入的学分。A+ 是 4.3。及格和不及格不算。这是估算，正式数字看成绩单。",
    es: "Universidad de Oregón y Lane Community College: puntos ÷ créditos con nota. A+ es 4.3. Pass y no-pass no entran. Es un estimado. El número real está en el expediente.",
    ko: "오리건 대학교와 Lane Community College 방식이에요. 점수를 성적에 들어가는 학점으로 나눠요. A+는 4.3이에요. Pass와 No Pass는 빠져요. 대략적인 숫자이고, 정확한 건 성적표에 있어요.",
    vi: "Cách của Đại học Oregon và Lane Community College: điểm chia cho tín chỉ tính GPA. A+ là 4.3. Pass và no-pass không tính. Đây là ước lượng. Số chính thức ở trên bảng điểm.",
    ja: "オレゴン大学と Lane Community College の計算です。成績点 ÷ GPA に入る単位。A+ は 4.3 です。Pass と No Pass は入りません。これは目安で、正式な数字は成績表です。",
  },
  high: {
    en: "Eugene 4J: A is 4, B is 3, C is 2, D is 1, F is 0. Plus and minus do not change the points. Only AP, IB, and College Now are weighted. Honors are not. The transcript shows both GPAs. This is an estimate.",
    zh: "按尤金 4J 学区的算法。A 是 4，B 是 3，C 是 2，D 是 1，F 是 0。加号和减号不改分数。只有 AP、IB、College Now 加权，荣誉课不加。成绩单上有两个 GPA。这是估算。",
    es: "Distrito 4J de Eugene: A es 4, B es 3, C es 2, D es 1, F es 0. El más y el menos no cambian el punto. Solo AP, IB y College Now pesan más. Honors no. El expediente muestra los dos GPA. Es un estimado.",
    ko: "유진 4J 학구 방식이에요. A는 4, B는 3, C는 2, D는 1, F는 0이에요. 플러스와 마이너스는 점수를 바꾸지 않아요. AP, IB, College Now만 가중되고 아너스는 안 돼요. 성적표에는 GPA가 두 개 있어요. 이건 대략적인 숫자예요.",
    vi: "Cách của học khu 4J Eugene: A là 4, B là 3, C là 2, D là 1, F là 0. Dấu cộng trừ không đổi điểm. Chỉ AP, IB và College Now được tính hệ số. Honors thì không. Bảng điểm có hai GPA. Đây là ước lượng.",
    ja: "ユージン 4J 学区の計算です。A は 4、B は 3、C は 2、D は 1、F は 0。プラスとマイナスは点を変えません。加重されるのは AP、IB、College Now だけで、Honors は加重しません。成績表には GPA が二つあります。これは目安です。",
  },
  mid: {
    en: "Middle school transcripts do not always print a GPA. This uses A=4, B=3, C=2, D=1, F=0. Plus and minus do not change the points.",
    zh: "初中成绩单不一定写 GPA。这里按 A=4、B=3、C=2、D=1、F=0 估。加号和减号不改分数。",
    es: "La boleta de secundaria no siempre trae GPA. Aquí A=4, B=3, C=2, D=1, F=0. El más y el menos no cambian el punto.",
    ko: "중학교 성적표에 GPA가 없는 경우가 많아요. 여기서는 A=4, B=3, C=2, D=1, F=0으로 계산해요. 플러스와 마이너스는 점수를 바꾸지 않아요.",
    vi: "Học bạ cấp hai không phải lúc nào cũng ghi GPA. Ở đây A=4, B=3, C=2, D=1, F=0. Dấu cộng trừ không đổi điểm.",
    ja: "中学の成績表に GPA が無いことが多いです。ここでは A=4、B=3、C=2、D=1、F=0 で見積もります。プラスとマイナスは点を変えません。",
  },
  elem: {
    en: "Elementary report cards usually do not use GPA. This is only A=4, B=3, C=2, D=1, F=0, for your own estimate. It is not the school's formula.",
    zh: "小学一般不写 GPA。下面按 A=4、B=3、C=2、D=1、F=0 自己估，不是学校的算法。",
    es: "La boleta de primaria casi nunca usa GPA. Esto es solo A=4, B=3, C=2, D=1, F=0, para calcularlo tú. No es la fórmula de la escuela.",
    ko: "초등학교 성적표에는 보통 GPA가 없어요. A=4, B=3, C=2, D=1, F=0으로 직접 가늠하는 것뿐이고, 학교 공식은 아니에요.",
    vi: "Học bạ tiểu học thường không có GPA. Đây chỉ là A=4, B=3, C=2, D=1, F=0 để tự ước. Không phải cách của trường.",
    ja: "小学校の成績表に GPA は普通ありません。A=4、B=3、C=2、D=1、F=0 で自分用に見るだけです。学校の計算ではありません。",
  },
};

function toInput(row: GradeRow): GpaInput {
  return { grade: row.grade, credits: row.credits, boost: row.boost };
}

function GpaPage() {
  const lang = useLang();
  const level = useDesk((state) => state.level);
  const grades = useDesk((state) => state.buckets[state.level].grades);
  const priorGpa = useDesk((state) => state.buckets[state.level].priorGpa);
  const priorWeighted = useDesk((state) => state.buckets[state.level].priorWeighted);
  const priorCredits = useDesk((state) => state.buckets[state.level].priorCredits);
  const addGrade = useDesk((state) => state.addGrade);
  const removeGrade = useDesk((state) => state.removeGrade);
  const clearGrades = useDesk((state) => state.clearGrades);
  const setGpaPrior = useDesk((state) => state.setGpaPrior);

  const [title, setTitle] = useState("");
  const [credits, setCredits] = useState(defaultCredits(level));
  const [grade, setGrade] = useState<(typeof LETTERS)[number]>("A");
  const [boost, setBoost] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setCredits(defaultCredits(level));
    setBoost(false);
    setError("");
  }, [level]);

  const choices = creditChoices(level);
  const rows = grades.map(toInput);
  const plain = listGpa(level, rows, false);
  const weighted = level === "high" ? listGpa(level, rows, true) : null;
  const priorCreditH = parseCredits(priorCredits, 40000);
  const priorGpaH = parseGpaInput(priorGpa);
  const priorWeightedH = parseGpaInput(priorWeighted);
  const priorTouched =
    priorGpa.trim() !== "" || priorCredits.trim() !== "" || (level === "high" && priorWeighted.trim() !== "");
  const stillTyping = [priorGpa, priorCredits, level === "high" ? priorWeighted : ""].some((item) =>
    item.endsWith("."),
  );
  const priorBad =
    priorTouched &&
    !stillTyping &&
    (priorCreditH == null ||
      (priorGpa.trim() !== "" && priorGpaH == null) ||
      (level === "high" && priorWeighted.trim() !== "" && priorWeightedH == null) ||
      (level === "high" ? priorGpaH == null && priorWeightedH == null : priorGpaH == null));
  const combined =
    plain && priorGpaH != null && priorCreditH != null
      ? combinedGpa(level, rows, false, priorGpaH, priorCreditH)
      : null;
  const combinedWeighted =
    level === "high" && weighted && priorWeightedH != null && priorCreditH != null
      ? combinedGpa(level, rows, true, priorWeightedH, priorCreditH)
      : null;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!choices.includes(credits)) {
      setError(
        tr(lang, {
          en: "Pick a credit value from the list.",
          zh: "学分从列表里选。",
          es: "Elige los créditos de la lista.",
          ko: "학점은 목록에서 고르세요.",
          vi: "Hãy chọn tín chỉ trong danh sách.",
          ja: "単位は一覧から選んでください。",
        }),
      );
      return;
    }
    if (grades.length >= 40) {
      setError(
        tr(lang, {
          en: "40 classes is the limit. Put the older GPA in the box below instead.",
          zh: "最多 40 门。更早的 GPA 填在下面那一栏。",
          es: "El límite es 40 clases. El GPA anterior va en el recuadro de abajo.",
          ko: "수업은 40개가 한도예요. 예전 GPA는 아래 칸에 적어요.",
          vi: "Tối đa 40 môn. GPA cũ điền vào ô bên dưới.",
          ja: "授業は 40 個までです。それより前の GPA は下の欄へ。",
        }),
      );
      return;
    }
    addGrade({ title, credits: Number(credits), grade, boost: level === "high" && boost });
    setTitle("");
    setError("");
  }

  return (
    <div>
      <header className="mb-6 border-b border-ink pb-4">
        <p className="text-xs uppercase tracking-widest text-muted">GPA</p>
        <h1 className="mt-1 font-display text-4xl text-ink md:text-5xl">
          {tr(lang, { en: "GPA calculator", zh: "绩点计算", es: "Calculadora de GPA", ko: "GPA 계산", vi: "Tính GPA", ja: "GPA 計算" })}
        </h1>
        <p className="mt-3 max-w-xl text-ink">{tr(lang, INTRO[level])}</p>
      </header>

      {plain ? (
        <Result
          lang={lang}
          level={level}
          plain={plain}
          weighted={weighted}
          label={tr(lang, {
            en: "These classes",
            zh: "这几门课",
            es: "Estas clases",
            ko: "이 수업들",
            vi: "Những môn này",
            ja: "この授業",
          })}
        />
      ) : (
        <p className="text-muted">
          {tr(lang, {
            en: "No classes yet. Add one and the number shows up here.",
            zh: "还没有课。加上一门，数字会出现在这里。",
            es: "Todavía no hay clases. Agrega una y el número aparece aquí.",
            ko: "아직 수업이 없어요. 하나 더하면 숫자가 여기 나와요.",
            vi: "Chưa có môn nào. Thêm một môn, số sẽ hiện ở đây.",
            ja: "まだ授業がありません。一つ足すと、ここに数字が出ます。",
          })}
        </p>
      )}

      <form className="mt-8" onSubmit={submit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-ink sm:col-span-2">
            {tr(lang, {
              en: "Class name, optional",
              zh: "课名，可以不写",
              es: "Nombre de la clase, opcional",
              ko: "수업 이름, 비워도 돼요",
              vi: "Tên môn, có thể bỏ trống",
              ja: "授業名、空でもいいです",
            })}
            <input
              value={title}
              maxLength={80}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-md border border-line bg-paper px-3 font-normal"
            />
          </label>
          {level === "elem" ? (
            <p className="text-sm text-muted sm:col-span-2">
              {tr(lang, {
                en: "Each class counts as 1.",
                zh: "每门课按 1 个学分算。",
                es: "Cada clase cuenta como 1.",
                ko: "수업 하나당 학점 1로 계산해요.",
                vi: "Mỗi môn tính 1 tín chỉ.",
                ja: "授業ひとつを 1 単位として計算します。",
              })}
            </p>
          ) : (
            <label className="block text-sm font-medium text-ink">
              {tr(lang, { en: "Credits", zh: "学分", es: "Créditos", ko: "학점", vi: "Tín chỉ", ja: "単位" })}
              <select
                value={choices.includes(credits) ? credits : choices[0]}
                onChange={(event) => setCredits(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-md border border-line bg-paper px-3 font-normal"
              >
                {choices.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <span className="mt-1 block font-normal text-muted">
                {level === "uni"
                  ? tr(lang, {
                      en: "A class is often 4 credits.",
                      zh: "一门课常见是 4 个学分。",
                      es: "Una clase suele ser de 4 créditos.",
                      ko: "수업 하나는 보통 4학점이에요.",
                      vi: "Một môn thường là 4 tín chỉ.",
                      ja: "授業ひとつはよく 4 単位です。",
                    })
                  : tr(lang, {
                      en: "One semester of a class is usually 0.5.",
                      zh: "一个学期一门课通常是 0.5。",
                      es: "Un semestre de una clase suele ser 0.5.",
                      ko: "한 학기 수업은 보통 0.5예요.",
                      vi: "Một học kỳ một môn thường là 0.5.",
                      ja: "一学期の授業は普通 0.5 です。",
                    })}
              </span>
            </label>
          )}
          <label className="block text-sm font-medium text-ink">
            {tr(lang, { en: "Grade", zh: "成绩", es: "Nota", ko: "성적", vi: "Điểm", ja: "成績" })}
            <select
              value={grade}
              onChange={(event) => {
                const next = event.target.value;
                if (LETTERS.includes(next as (typeof LETTERS)[number])) {
                  setGrade(next as (typeof LETTERS)[number]);
                }
              }}
              className="mt-1 min-h-11 w-full rounded-md border border-line bg-paper px-3 font-normal"
            >
              {LETTERS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
        {level === "high" ? (
          <button
            type="button"
            aria-pressed={boost}
            onClick={() => setBoost((on) => !on)}
            className="mt-3 min-h-11 rounded-md border border-line bg-card px-3 text-left text-sm text-ink"
          >
            {boost
              ? tr(lang, {
                  en: "Counted as AP, IB, or College Now. Tap to turn that off.",
                  zh: "这门按 AP、IB 或 College Now 算。点一下取消。",
                  es: "Cuenta como AP, IB o College Now. Toca para quitarlo.",
                  ko: "이 수업은 AP, IB 또는 College Now로 계산해요. 누르면 꺼져요.",
                  vi: "Môn này tính là AP, IB hoặc College Now. Bấm để tắt.",
                  ja: "この授業は AP、IB、または College Now です。タップで外します。",
                })
              : tr(lang, {
                  en: "This is AP, IB, or College Now",
                  zh: "这门是 AP、IB 或 College Now",
                  es: "Esta es AP, IB o College Now",
                  ko: "이 수업은 AP, IB 또는 College Now예요",
                  vi: "Môn này là AP, IB hoặc College Now",
                  ja: "この授業は AP、IB、または College Now です",
                })}
          </button>
        ) : null}
        {error ? (
          <p role="alert" className="mt-3 text-sm text-ink">
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="submit">
            {tr(lang, { en: "Add class", zh: "加上", es: "Agregar", ko: "추가", vi: "Thêm", ja: "追加" })}
          </Button>
          {grades.length > 0 ? (
            <Button variant="ghost" onClick={clearGrades}>
              {tr(lang, { en: "Clear list", zh: "清空这张表", es: "Vaciar la lista", ko: "목록 비우기", vi: "Xóa danh sách", ja: "一覧を消す" })}
            </Button>
          ) : null}
        </div>
      </form>

      {grades.length > 0 ? (
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {grades.map((row) => (
            <li key={row.id} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{row.title || row.grade}</p>
                <p className="text-sm text-muted">
                  {row.title ? `${row.grade} · ` : ""}
                  {formatCredits(Math.round(row.credits * 100))}{" "}
                  {tr(lang, { en: "credits", zh: "学分", es: "créditos", ko: "학점", vi: "tín chỉ", ja: "単位" })}
                  {level === "high" && row.boost
                    ? ` · ${tr(lang, { en: "weighted", zh: "加权", es: "con peso", ko: "가중", vi: "có hệ số", ja: "加重" })}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeGrade(row.id)}
                className="min-h-11 shrink-0 px-2 text-sm text-muted"
              >
                {tr(lang, { en: "Remove", zh: "删", es: "Quitar", ko: "삭제", vi: "Xóa", ja: "削除" })}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <section className="mt-8 border-t border-line pt-6">
        <h2 className="font-display text-3xl text-ink">
          {tr(lang, {
            en: "Already on the transcript",
            zh: "成绩单上已有的",
            es: "Lo que ya está en el expediente",
            ko: "성적표에 이미 있는 것",
            vi: "Đã có trên bảng điểm",
            ja: "成績表にすでにある分",
          })}
        </h2>
        <p className="mt-1 max-w-xl text-sm text-muted">
          {tr(lang, {
            en: "Optional. Fill both the old GPA and the old credits, and this list is added on top.",
            zh: "可以不填。旧 GPA 和旧学分都填上，上面这几门课会叠上去。",
            es: "Opcional. Llena el GPA viejo y los créditos viejos, y estas clases se suman.",
            ko: "안 써도 돼요. 예전 GPA와 예전 학점을 둘 다 쓰면, 위 수업이 그 위에 더해져요.",
            vi: "Không bắt buộc. Điền cả GPA cũ và tín chỉ cũ, những môn ở trên sẽ được cộng vào.",
            ja: "空でもいいです。前の GPA と前の単位を両方書くと、上の授業が足されます。",
          })}
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-ink">
            {level === "high"
              ? tr(lang, {
                  en: "Unweighted GPA",
                  zh: "不计权重的 GPA",
                  es: "GPA sin peso",
                  ko: "비가중 GPA",
                  vi: "GPA không hệ số",
                  ja: "加重なし GPA",
                })
              : tr(lang, { en: "GPA already earned", zh: "已有 GPA", es: "GPA que ya tienes", ko: "이미 있는 GPA", vi: "GPA đã có", ja: "すでにある GPA" })}
            <input
              inputMode="decimal"
              value={priorGpa}
              onChange={(event) => setGpaPrior({ gpa: event.target.value })}
              placeholder="3.50"
              className="mt-1 min-h-11 w-full rounded-md border border-line bg-paper px-3 font-normal tabular-nums"
            />
          </label>
          {level === "high" ? (
            <label className="block text-sm font-medium text-ink">
              {tr(lang, {
                en: "Weighted GPA",
                zh: "加权 GPA",
                es: "GPA con peso",
                ko: "가중 GPA",
                vi: "GPA có hệ số",
                ja: "加重 GPA",
              })}
              <input
                inputMode="decimal"
                value={priorWeighted}
                onChange={(event) => setGpaPrior({ weighted: event.target.value })}
                placeholder="3.70"
                className="mt-1 min-h-11 w-full rounded-md border border-line bg-paper px-3 font-normal tabular-nums"
              />
            </label>
          ) : null}
          <label className="block text-sm font-medium text-ink">
            {tr(lang, {
              en: "Credits already earned",
              zh: "已有学分",
              es: "Créditos que ya tienes",
              ko: "이미 있는 학점",
              vi: "Tín chỉ đã có",
              ja: "すでにある単位",
            })}
            <input
              inputMode="decimal"
              value={priorCredits}
              onChange={(event) => setGpaPrior({ credits: event.target.value })}
              placeholder={level === "uni" ? "16" : "12"}
              className="mt-1 min-h-11 w-full rounded-md border border-line bg-paper px-3 font-normal tabular-nums"
            />
          </label>
        </div>
        {priorBad ? (
          <p role="alert" className="mt-3 text-sm text-ink">
            {tr(lang, {
              en: "The old GPA and the old credits have to go together. GPA is 0 to 5. Credits start at 0.5, up to 400, in steps of 0.5.",
              zh: "旧 GPA 和旧学分要一起填。GPA 从 0 到 5。学分从 0.5 起，最多 400，按 0.5 加。",
              es: "El GPA viejo y los créditos viejos van juntos. El GPA es de 0 a 5. Los créditos empiezan en 0.5, hasta 400, de 0.5 en 0.5.",
              ko: "예전 GPA와 예전 학점은 같이 써야 해요. GPA는 0에서 5까지예요. 학점은 0.5부터 400까지, 0.5씩 늘려요.",
              vi: "GPA cũ và tín chỉ cũ phải điền cùng nhau. GPA từ 0 đến 5. Tín chỉ từ 0.5 đến 400, mỗi bước 0.5.",
              ja: "前の GPA と前の単位はセットで書いてください。GPA は 0 から 5。単位は 0.5 から 400 まで、0.5 刻みです。",
            })}
          </p>
        ) : null}
        {combined || combinedWeighted ? (
          <div className="mt-4">
            <Result
              lang={lang}
              level={level}
              plain={combined}
              weighted={combinedWeighted}
              label={tr(lang, {
                en: "Old plus these classes",
                zh: "旧的加上这几门",
                es: "Lo viejo más estas clases",
                ko: "예전 것에 이 수업을 더한 값",
                vi: "Cũ cộng những môn này",
                ja: "前の分にこの授業を足した数",
              })}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Result({
  lang,
  level,
  plain,
  weighted,
  label,
}: {
  lang: Lang;
  level: Level;
  plain: GpaFigure | null;
  weighted: GpaFigure | null;
  label: string;
}) {
  const shown = plain ?? weighted;
  if (!shown) return null;
  const creditLine = `${formatCredits(shown.creditHundredths)} ${tr(lang, {
    en: "credits",
    zh: "学分",
    es: "créditos",
    ko: "학점",
    vi: "tín chỉ",
    ja: "単位",
  })}`;
  return (
    <section className="rounded-lg border border-line bg-card p-4">
      <p className="text-xs uppercase tracking-widest text-muted">{label}</p>
      {level === "high" && plain && weighted ? (
        <div className="mt-2 grid grid-cols-2 gap-4">
          <Figure
            value={formatGpa(plain.gpaHundredths)}
            caption={tr(lang, { en: "Unweighted", zh: "不计权重", es: "Sin peso", ko: "비가중", vi: "Không hệ số", ja: "加重なし" })}
          />
          <Figure
            value={formatGpa(weighted.gpaHundredths)}
            caption={tr(lang, { en: "Weighted", zh: "加权", es: "Con peso", ko: "가중", vi: "Có hệ số", ja: "加重" })}
          />
        </div>
      ) : plain ? (
        <Figure
          value={formatGpa(plain.gpaHundredths)}
          caption={
            level === "high"
              ? tr(lang, { en: "Unweighted", zh: "不计权重", es: "Sin peso", ko: "비가중", vi: "Không hệ số", ja: "加重なし" })
              : "GPA"
          }
        />
      ) : weighted ? (
        <Figure
          value={formatGpa(weighted.gpaHundredths)}
          caption={tr(lang, { en: "Weighted", zh: "加权", es: "Con peso", ko: "가중", vi: "Có hệ số", ja: "加重" })}
        />
      ) : null}
      <p className="mt-2 text-sm text-muted">{creditLine}</p>
    </section>
  );
}

function Figure({ value, caption }: { value: string; caption: string }) {
  return (
    <p className="font-display text-5xl leading-none tabular-nums text-moss">
      {value}
      <span className="mt-1 block font-sans text-xs font-normal uppercase tracking-widest text-muted">{caption}</span>
    </p>
  );
}
