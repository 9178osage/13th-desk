import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { chartTicks, tooltipLeft } from "@/lib/chart-ticks";
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
  const tip = useRef<HTMLDivElement>(null);
  const [tipWidth, setTipWidth] = useState(0);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Measured before paint, so the tooltip is placed with its real width (language, digits).
  useLayoutEffect(() => {
    if (active !== null && tip.current) setTipWidth(tip.current.offsetWidth);
  }, [active, lang, size.width]);

  const chartName = tr(lang, { en: "Grade points by credit", zh: "绩点分布（按学分）" });
  const pointsWord = tr(lang, { en: "Points", zh: "点数" });
  const creditsWord = tr(lang, { en: "credits", zh: "学分" });
  const ticks = chartTicks(Math.max(0, ...data.map((d) => d.credits)));
  const top = ticks.at(-1) ?? 1;
  const plotW = Math.max(0, size.width - MARGIN.left - MARGIN.right);
  const plotH = Math.max(0, size.height - MARGIN.top - MARGIN.bottom);
  const y = (v: number) => MARGIN.top + plotH - (v / top) * plotH;
  const slot = data.length ? plotW / data.length : 0;
  const barW = Math.min(slot * 0.8, 96);
  const shown = active !== null ? data[active] : null;

  return (
    <div ref={box} className="relative h-full w-full">
      {size.width > 0 && (
        <svg
          width={size.width}
          height={size.height}
          // A group, not role="img": an image's children are hidden from assistive tech, and
          // each bar below is a focusable image of its own (audit 2026-11-28 P2-04).
          role="group"
          aria-label={chartName}
          className="block overflow-visible"
        >
          {ticks.map((t) => (
            <g key={t} aria-hidden="true">
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
                role="img"
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
            aria-hidden="true"
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
          ref={tip}
          aria-hidden="true"
          className="pointer-events-none absolute whitespace-nowrap rounded-lg border px-2 py-1 text-[13px] shadow-sm"
          style={{
            background: "#fffdf8",
            borderColor: GRID,
            left: tooltipLeft(MARGIN.left + slot * active + slot / 2, tipWidth, size.width),
            maxWidth: size.width,
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
