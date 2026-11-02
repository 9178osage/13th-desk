import { useEffect, useRef, useState } from "react";
import { chartTicks } from "@/lib/chart-ticks";
import { tr, type Lang } from "@/lib/text";

const BAR_COLORS = [
  "var(--color-moss)",
  "var(--color-ink)",
  "var(--color-muted)",
  "var(--color-moss-deep)",
  "var(--color-accent-teal)",
];

const GRID = "#ddd3c3";
const LABEL = "#3e4a43";
const MARGIN = { top: 8, right: 8, bottom: 34, left: 36 };

export type GpaChartDatum = { points: string; credits: number };

/** Credits per grade-point bar chart, plain SVG; lazy-loaded from the GPA route. */
export default function GpaChart({ data, lang }: { data: GpaChartDatum[]; lang: Lang }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const pointsWord = tr(lang, { en: "Points", zh: "点数" });
  const creditsWord = tr(lang, { en: "credits", zh: "学分" });
  const ticks = chartTicks(Math.max(0, ...data.map((d) => d.credits)));
  const top = ticks.at(-1) ?? 1;
  const plotW = Math.max(0, size.width - MARGIN.left - MARGIN.right);
  const plotH = Math.max(0, size.height - MARGIN.top - MARGIN.bottom);
  const y = (v: number) => MARGIN.top + plotH - (v / top) * plotH;
  const slot = data.length ? plotW / data.length : 0;
  const barW = Math.min(slot * 0.8, 96);
  const summary = data
    .map((d) => `${pointsWord} ${d.points}: ${d.credits} ${creditsWord}`)
    .join("; ");
  const shown = active !== null ? data[active] : null;

  return (
    <div ref={box} className="relative h-full w-full">
      {size.width > 0 && (
        <svg
          width={size.width}
          height={size.height}
          role="img"
          aria-label={summary}
          className="block overflow-visible"
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={MARGIN.left}
                x2={MARGIN.left + plotW}
                y1={y(t)}
                y2={y(t)}
                stroke={GRID}
                strokeDasharray={t === 0 ? undefined : "3 3"}
              />
              <text
                x={MARGIN.left - 6}
                y={y(t)}
                textAnchor="end"
                dominantBaseline="middle"
                fill={LABEL}
                fontSize={12}
              >
                {t}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const h = (d.credits / top) * plotH;
            const x = MARGIN.left + slot * i + (slot - barW) / 2;
            const r = Math.min(6, barW / 2, h);
            const yTop = MARGIN.top + plotH - h;
            const path =
              h <= 0
                ? ""
                : `M${x},${yTop + h} V${yTop + r} Q${x},${yTop} ${x + r},${yTop} H${x + barW - r} Q${x + barW},${yTop} ${x + barW},${yTop + r} V${yTop + h} Z`;
            return (
              <g
                key={`${d.points}:${i}`}
                tabIndex={0}
                aria-label={`${pointsWord} ${d.points}: ${d.credits} ${creditsWord}`}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="outline-none focus-visible:[&>path]:stroke-ink focus-visible:[&>path]:stroke-2"
              >
                <rect
                  x={MARGIN.left + slot * i}
                  y={MARGIN.top}
                  width={slot}
                  height={plotH}
                  fill="transparent"
                />
                {path && <path d={path} fill={BAR_COLORS[i % BAR_COLORS.length]} />}
                <text
                  x={MARGIN.left + slot * i + slot / 2}
                  y={MARGIN.top + plotH + 16}
                  textAnchor="middle"
                  fill={LABEL}
                  fontSize={12}
                >
                  {d.points}
                </text>
              </g>
            );
          })}
          <text
            x={MARGIN.left + plotW / 2}
            y={size.height - 2}
            textAnchor="middle"
            fill={LABEL}
            fontSize={11}
          >
            {pointsWord}
          </text>
        </svg>
      )}
      {shown && active !== null && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-lg border px-2 py-1 text-[13px] shadow-sm"
          style={{
            background: "#fffdf8",
            borderColor: GRID,
            left: Math.min(MARGIN.left + slot * active + slot / 2, Math.max(0, size.width - 120)),
            top: MARGIN.top,
          }}
        >
          <div>{`${pointsWord} ${shown.points}`}</div>
          <div>{`${shown.credits} ${creditsWord}`}</div>
        </div>
      )}
    </div>
  );
}
