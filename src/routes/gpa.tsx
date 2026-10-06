import { lazy, Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Button, Card, EmptyState, Input, SectionHeader, Stat } from "@/components/ui";
import {
  LETTERS,
  combinedGpa,
  currentPoints,
  creditChoices,
  defaultCredits,
  formatCredits,
  formatGpa,
  listGpa,
  parseCredits,
  parseGpaInput,
  pointsTenths,
  type GpaFigure,
  type GpaInput,
} from "@/lib/gpa";
import type { Level } from "@/lib/levels";
import type { GradeRow } from "@/lib/store";
import { useDesk, useLang } from "@/lib/store";
import { tr, type Copy, type Lang } from "@/lib/text";

// Recharts is heavy; it only downloads once there is something to chart.
const GpaChart = lazy(() => import("@/components/gpa-chart"));

export const Route = createFileRoute("/gpa")({
  head: () => ({
    meta: [
      { title: "GPA · Eugene Desk" },
      {
        name: "description",
        content:
          "Free GPA calculator for UO, Lane Community College, and Oregon high school grades — add classes, combine with your current GPA, and try a target.",
      },
    ],
  }),
  component: GpaPage,
});

const INTRO: Record<Level, Copy> = {
  uni: {
    en: "University of Oregon and Lane Community College: points divided by graded credits. A+ is 4.3. Pass and no-pass stay out. This is an estimate. The transcript is the real number.",
    zh: "适用于俄勒冈大学和莱恩社区学院：GPA = 总成绩点数 ÷ 计入 GPA 的总学分，A+ 计 4.3。P/NP 等非字母评分不计入，但 F 计 0 分。结果仅供估算，正式成绩以学校成绩单为准。",
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
  const [target, setTarget] = useState("3.50");
  const [whatIfCredits, setWhatIfCredits] = useState(defaultCredits(level));

  useEffect(() => {
    setCredits(defaultCredits(level));
    setWhatIfCredits(defaultCredits(level));
    setBoost(false);
    setError("");
  }, [level]);

  const choices = creditChoices(level);
  const rows = grades.map(toInput);
  const plain = listGpa(level, rows, false);
  const weighted = level === "high" ? listGpa(level, rows, true) : null;
  const priorCreditH = parseCredits(priorCredits, 40000);
  const priorGpaH = parseGpaInput(priorGpa, level === "uni" ? 430 : 400);
  const priorWeightedH = parseGpaInput(priorWeighted);
  const priorTouched =
    priorGpa.trim() !== "" ||
    priorCredits.trim() !== "" ||
    (level === "high" && priorWeighted.trim() !== "");
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
    priorGpaH != null && priorCreditH != null
      ? combinedGpa(level, rows, false, priorGpaH, priorCreditH)
      : null;
  const combinedWeighted =
    level === "high" && priorWeightedH != null && priorCreditH != null
      ? combinedGpa(level, rows, true, priorWeightedH, priorCreditH)
      : null;

  const chartData = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const row of grades) {
      const pts = pointsTenths(level, toInput(row), false) / 10;
      const key = pts.toFixed(1);
      buckets.set(key, (buckets.get(key) ?? 0) + row.credits);
    }
    return [...buckets.entries()]
      .map(([points, creditsSum]) => ({ points, credits: creditsSum }))
      .sort((a, b) => Number(a.points) - Number(b.points));
  }, [grades, level]);

  const whatIfHint = useMemo(() => {
    const targetH = parseGpaInput(target, level === "uni" ? 430 : 400);
    const addCredits = parseCredits(whatIfCredits, 1000);
    const base = combined ?? plain;
    if (!base || targetH == null || addCredits == null) return null;
    // Rough: needed average points (tenths) on the next block to hit target
    // target = (currentPoints + needed*credits) / (currentCredits + credits)
    const totalPoints =
      currentPoints(level, rows, false) +
      (combined && priorGpaH != null && priorCreditH != null ? priorGpaH * priorCreditH : 0);
    // needed is in gpa-hundredths (same units as priorGpaH / gpaHundredths)
    const needed = (targetH * (base.creditHundredths + addCredits) - totalPoints) / addCredits;
    if (!Number.isFinite(needed)) return null;
    return needed / 100;
  }, [combined, plain, target, whatIfCredits, level, rows, priorGpaH, priorCreditH]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!choices.includes(credits)) {
      setError(
        tr(lang, {
          en: "Pick a credit value from the list.",
          zh: "请从列表中选择课程学分。",
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
          en: "40 classes is the limit. Put an older GPA in the box below instead.",
          zh: "最多添加 40 门课程。之前的成绩可在下方填写历史 GPA 和对应学分。",
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
    <div className="flex flex-col gap-8">
      <header className="border-b border-ink/80 pb-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">GPA</p>
        <h1 className="mt-1 font-display text-4xl text-ink md:text-5xl">
          {tr(lang, {
            en: "GPA calculator",
            zh: "绩点计算",
            es: "Calculadora de GPA",
            ko: "GPA 계산",
            vi: "Tính GPA",
            ja: "GPA 計算",
          })}
        </h1>
        <p className="mt-3 max-w-xl text-ink">{tr(lang, INTRO[level])}</p>
        {level === "uni" && (
          <div className="mt-3 flex flex-wrap gap-x-4 text-sm text-moss">
            <a
              className="inline-flex min-h-11 items-center"
              href="https://registrar.uoregon.edu/grades-records/grading-system"
              target="_blank"
              rel="noopener noreferrer"
            >
              UO ·{" "}
              {tr(lang, {
                en: "Grading system",
                zh: "评分标准",
                es: "Sistema de calificación",
                ko: "성적 기준",
                vi: "Thang điểm",
                ja: "成績評価基準",
              })}{" "}
              ↗
            </a>
            <a
              className="inline-flex min-h-11 items-center"
              href="https://lanecc.smartcatalogiq.com/en/current/lcc-catalog/policies/student-affairs/grades-and-gpa/grade-point-average-gpa"
              target="_blank"
              rel="noopener noreferrer"
            >
              Lane · GPA ↗
            </a>
          </div>
        )}
      </header>

      {plain ? (
        <Result
          lang={lang}
          level={level}
          plain={plain}
          weighted={weighted}
          label={tr(lang, {
            en: "These classes",
            zh: "当前课程 GPA",
            es: "Estas clases",
            ko: "이 수업들",
            vi: "Những môn này",
            ja: "この授業",
          })}
        />
      ) : (
        <EmptyState
          title={tr(lang, { en: "No classes yet", zh: "还没有添加课程" })}
          body={tr(lang, {
            en: "Add a class and the number shows up here.",
            zh: "添加课程、学分和成绩后，这里会显示计算结果。",
            es: "Agrega una y el número aparece aquí.",
            ko: "하나 더하면 숫자가 여기 나와요.",
            vi: "Thêm một môn, số sẽ hiện ở đây.",
            ja: "一つ足すと、ここに数字が出ます。",
          })}
        />
      )}

      {chartData.length > 0 ? (
        <Card>
          <SectionHeader
            className="mb-3"
            kicker={tr(lang, { en: "Visual", zh: "图示" })}
            title={tr(lang, { en: "Grade points by credit", zh: "绩点分布（按学分）" })}
          />
          <div className="h-56 w-full">
            <Suspense fallback={null}>
              <GpaChart data={chartData} lang={lang} />
            </Suspense>
          </div>
        </Card>
      ) : null}

      {(plain || combined) && (
        <Card>
          <SectionHeader
            className="mb-3"
            kicker={tr(lang, { en: "What if", zh: "假如" })}
            title={tr(lang, { en: "Target GPA", zh: "目标绩点" })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-ink">
              {tr(lang, { en: "Target GPA", zh: "目标 GPA" })}
              <Input
                inputMode="decimal"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="mt-1 tabular-nums"
                placeholder="3.50"
              />
            </label>
            <label className="block text-sm font-medium text-ink">
              {tr(lang, { en: "Next credits", zh: "后续课程学分" })}
              <select
                value={choices.includes(whatIfCredits) ? whatIfCredits : choices[0]}
                onChange={(e) => setWhatIfCredits(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-md border border-line bg-card px-3 font-normal shadow-sm"
              >
                {choices.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {whatIfHint != null ? (
            <p className="mt-3 text-sm text-ink">
              {tr(lang, {
                en: "To land near that target on the next credits, you’d need about",
                zh: "若要达到目标，后续课程的平均绩点需要约为",
              })}{" "}
              <span className="font-display text-xl text-moss tabular-nums">
                {whatIfHint.toFixed(2)}
              </span>{" "}
              {tr(lang, { en: "GPA on those credits (estimate).", zh: "（估算）。" })}
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted">
              {tr(lang, {
                en: "Enter a target within your school level’s GPA scale and the number of future credits.",
                zh: "请填写当前学段范围内的目标 GPA 和后续学分，查看所需成绩。",
                es: "Introduce un objetivo dentro de la escala de tu nivel y los créditos futuros.",
                ko: "학교 단계의 GPA 범위 안에서 목표와 앞으로 이수할 학점을 입력하세요.",
                vi: "Nhập GPA mục tiêu trong thang điểm của bậc học và số tín chỉ sắp tới.",
                ja: "学校区分のGPA範囲内で目標値と今後の単位数を入力してください。",
              })}
            </p>
          )}
        </Card>
      )}

      <form onSubmit={submit}>
        <SectionHeader className="mb-3" title={tr(lang, { en: "Add a class", zh: "添加课程" })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-ink sm:col-span-2">
            {tr(lang, {
              en: "Class name (optional)",
              zh: "课程名称（选填）",
              es: "Nombre de la clase, opcional",
              ko: "수업 이름, 비워도 돼요",
              vi: "Tên môn, có thể bỏ trống",
              ja: "授業名、空でもいいです",
            })}
            <Input
              value={title}
              maxLength={80}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 font-normal"
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
              {tr(lang, {
                en: "Credits",
                zh: "学分",
                es: "Créditos",
                ko: "학점",
                vi: "Tín chỉ",
                ja: "単位",
              })}
              <select
                value={choices.includes(credits) ? credits : choices[0]}
                onChange={(event) => setCredits(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-md border border-line bg-card px-3 font-normal shadow-sm"
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
                    })
                  : tr(lang, {
                      en: "One semester of a class is usually 0.5.",
                      zh: "一个学期一门课通常是 0.5。",
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
              className="mt-1 min-h-11 w-full rounded-md border border-line bg-card px-3 font-normal shadow-sm"
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
            className="mt-3 min-h-11 rounded-md border border-line bg-card px-3 text-left text-sm text-ink shadow-sm"
          >
            {boost
              ? tr(lang, {
                  en: "Counted as AP, IB, or College Now. Tap to turn off.",
                  zh: "已按 AP、IB 或 College Now 课程加权，点击取消。",
                })
              : tr(lang, {
                  en: "This is AP, IB, or College Now",
                  zh: "这是一门 AP、IB 或 College Now 课程",
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
            {tr(lang, { en: "Add", zh: "添加", es: "Agregar", ko: "추가", vi: "Thêm", ja: "追加" })}
          </Button>
          {grades.length > 0 ? (
            <AlertDialog.Root>
              <AlertDialog.Trigger asChild>
                <Button variant="ghost">
                  {tr(lang, {
                    en: "Clear list",
                    zh: "清空课程列表",
                    es: "Vaciar la lista",
                    ko: "목록 비우기",
                    vi: "Xóa danh sách",
                    ja: "一覧を消す",
                  })}
                </Button>
              </AlertDialog.Trigger>
              <AlertDialog.Portal>
                <AlertDialog.Overlay className="dialog-overlay" />
                <AlertDialog.Content className="dialog-content">
                  <AlertDialog.Title className="text-xl font-medium">
                    {tr(lang, {
                      en: "Clear these courses?",
                      zh: "清空当前课程？",
                      es: "¿Borrar estos cursos?",
                      ko: "이 과목을 모두 지울까요?",
                      vi: "Xóa các môn này?",
                      ja: "これらの科目を削除しますか？",
                    })}
                  </AlertDialog.Title>
                  <AlertDialog.Description className="mt-3 text-sm text-muted">
                    {tr(lang, {
                      en: "This removes the course list for this school level. Prior GPA and other levels are kept. This cannot be undone.",
                      zh: "将删除当前学段的课程列表，历史绩点和其他学段的数据不受影响。此操作无法撤销。",
                      es: "Se borrará la lista de este nivel. El GPA previo y los otros niveles se conservan. No se puede deshacer.",
                      ko: "이 학교 단계의 과목 목록을 삭제해요. 이전 GPA와 다른 단계는 유지돼요. 되돌릴 수 없어요.",
                      vi: "Xóa danh sách môn của bậc này. GPA trước đây và các bậc khác được giữ lại. Không thể hoàn tác.",
                      ja: "この学校区分の科目一覧を削除します。過去のGPAと他の区分は残ります。元に戻せません。",
                    })}
                  </AlertDialog.Description>
                  <div className="form-actions">
                    <AlertDialog.Cancel asChild>
                      <Button variant="quiet">
                        {tr(lang, {
                          en: "Cancel",
                          zh: "取消",
                          es: "Cancelar",
                          ko: "취소",
                          vi: "Hủy",
                          ja: "キャンセル",
                        })}
                      </Button>
                    </AlertDialog.Cancel>
                    <AlertDialog.Action asChild>
                      <Button onClick={clearGrades}>
                        {tr(lang, {
                          en: "Clear list",
                          zh: "确认清空",
                          es: "Borrar lista",
                          ko: "목록 삭제",
                          vi: "Xóa danh sách",
                          ja: "一覧を削除",
                        })}
                      </Button>
                    </AlertDialog.Action>
                  </div>
                </AlertDialog.Content>
              </AlertDialog.Portal>
            </AlertDialog.Root>
          ) : null}
        </div>
      </form>

      {grades.length > 0 ? (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-card shadow-paper">
          {grades.map((row) => (
            <li key={row.id} className="flex items-center gap-3 px-4 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{row.title || row.grade}</p>
                <p className="text-sm text-muted">
                  {row.title ? `${row.grade} · ` : ""}
                  {formatCredits(Math.round(row.credits * 100))}{" "}
                  {tr(lang, {
                    en: "credits",
                    zh: "学分",
                    es: "créditos",
                    ko: "학점",
                    vi: "tín chỉ",
                    ja: "単位",
                  })}
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
                {tr(lang, {
                  en: "Remove",
                  zh: "删除",
                  es: "Quitar",
                  ko: "삭제",
                  vi: "Xóa",
                  ja: "削除",
                })}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <Card className="border-t-0">
        <SectionHeader
          className="mb-2"
          title={tr(lang, {
            en: "Already on your transcript",
            zh: "历史成绩",
            es: "Lo que ya está en el expediente",
            ko: "성적표에 이미 있는 것",
            vi: "Đã có trên bảng điểm",
            ja: "成績表にすでにある分",
          })}
        />
        <p className="mb-3 max-w-xl text-sm text-muted">
          {tr(lang, {
            en: "Optional. Fill both old GPA and old credits, and this list stacks on top.",
            zh: "选填。填写历史 GPA 和对应学分后，将与当前课程一起计算累计 GPA。",
            es: "Opcional. Llena el GPA viejo y los créditos viejos, y estas clases se suman.",
            ko: "안 써도 돼요. 예전 GPA와 예전 학점을 둘 다 쓰면, 위 수업이 그 위에 더해져요.",
            vi: "Không bắt buộc. Điền cả GPA cũ và tín chỉ cũ, những môn ở trên sẽ được cộng vào.",
            ja: "空でもいいです。前の GPA と前の単位を両方書くと、上の授業が足されます。",
          })}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-ink">
            {level === "high"
              ? tr(lang, {
                  en: "Unweighted GPA",
                  zh: "未加权 GPA",
                  es: "GPA sin peso",
                  ko: "비가중 GPA",
                  vi: "GPA không hệ số",
                  ja: "加重なし GPA",
                })
              : tr(lang, {
                  en: "GPA already earned",
                  zh: "已有 GPA",
                  es: "GPA que ya tienes",
                  ko: "이미 있는 GPA",
                  vi: "GPA đã có",
                  ja: "すでにある GPA",
                })}
            <Input
              inputMode="decimal"
              value={priorGpa}
              onChange={(event) => setGpaPrior({ gpa: event.target.value })}
              placeholder="3.50"
              className="mt-1 tabular-nums"
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
              <Input
                inputMode="decimal"
                value={priorWeighted}
                onChange={(event) => setGpaPrior({ weighted: event.target.value })}
                placeholder="3.70"
                className="mt-1 tabular-nums"
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
            <Input
              inputMode="decimal"
              value={priorCredits}
              onChange={(event) => setGpaPrior({ credits: event.target.value })}
              placeholder={level === "uni" ? "16" : "12"}
              className="mt-1 tabular-nums"
            />
          </label>
        </div>
        {priorBad ? (
          <p role="alert" className="mt-3 text-sm text-ink">
            {tr(lang, {
              en: "Enter both prior GPA and credits. GPA range: university 0–4.3, unweighted school 0–4, weighted high school 0–5. Credits: 0.5–400, in steps of 0.5.",
              zh: "请同时填写历史 GPA 和对应学分。大学 GPA 为 0–4.3，中小学未加权 GPA 为 0–4，高中加权 GPA 为 0–5。学分范围为 0.5–400，须为 0.5 的倍数。",
              es: "Introduce GPA previo y créditos. GPA: universidad 0–4.3, escolar sin ponderar 0–4, secundaria ponderado 0–5. Créditos: 0.5–400, en pasos de 0.5.",
              ko: "이전 GPA와 학점을 함께 입력하세요. 대학 0–4.3, 학교 비가중 0–4, 고등학교 가중 0–5. 학점은 0.5–400, 0.5 단위예요.",
              vi: "Nhập cả GPA cũ và tín chỉ. Đại học: 0–4.3, phổ thông không trọng số: 0–4, THPT có trọng số: 0–5. Tín chỉ: 0.5–400, bước 0.5.",
              ja: "過去のGPAと単位数を両方入力してください。大学0–4.3、学校の非加重0–4、高校の加重0–5。単位数は0.5–400で0.5刻みです。",
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
                en: "Old GPA plus these",
                zh: "累计 GPA",
                es: "Lo viejo más estas clases",
                ko: "예전 것에 이 수업을 더한 값",
                vi: "Cũ cộng những môn này",
                ja: "前の分にこの授業を足した数",
              })}
            />
          </div>
        ) : null}
      </Card>
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
    <Card>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{label}</p>
      {level === "high" && plain && weighted ? (
        <div className="mt-2 grid grid-cols-2 gap-4">
          <Stat
            value={formatGpa(plain.gpaHundredths)}
            label={tr(lang, {
              en: "Unweighted",
              zh: "未加权",
              es: "Sin peso",
              ko: "비가중",
              vi: "Không hệ số",
              ja: "加重なし",
            })}
          />
          <Stat
            value={formatGpa(weighted.gpaHundredths)}
            label={tr(lang, {
              en: "Weighted",
              zh: "加权",
              es: "Con peso",
              ko: "가중",
              vi: "Có hệ số",
              ja: "加重",
            })}
          />
        </div>
      ) : plain ? (
        <div className="mt-2">
          <Stat
            value={formatGpa(plain.gpaHundredths)}
            label={
              level === "high"
                ? tr(lang, {
                    en: "Unweighted",
                    zh: "未加权",
                    es: "Sin peso",
                    ko: "비가중",
                    vi: "Không hệ số",
                    ja: "加重なし",
                  })
                : "GPA"
            }
          />
        </div>
      ) : weighted ? (
        <div className="mt-2">
          <Stat
            value={formatGpa(weighted.gpaHundredths)}
            label={tr(lang, {
              en: "Weighted",
              zh: "加权",
              es: "Con peso",
              ko: "가중",
              vi: "Có hệ số",
              ja: "加重",
            })}
          />
        </div>
      ) : null}
      <p className="mt-2 text-sm text-muted">{creditLine}</p>
    </Card>
  );
}
