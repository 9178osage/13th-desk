import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { tr, type Lang } from "@/lib/text";

const BAR_COLORS = [
  "var(--color-moss)",
  "var(--color-ink)",
  "var(--color-muted)",
  "var(--color-moss-deep)",
  "var(--color-accent-teal)",
];

export type GpaChartDatum = { points: string; credits: number };

/** Credits per grade-point bar chart; lazy-loaded from the GPA route. */
export default function GpaChart({ data, lang }: { data: GpaChartDatum[]; lang: Lang }) {
  const chartData = data;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 14 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ddd3c3" vertical={false} />
        <XAxis
          dataKey="points"
          tick={{ fill: "#3e4a43", fontSize: 12 }}
          axisLine={{ stroke: "#ddd3c3" }}
          tickLine={false}
          label={{
            value: tr(lang, { en: "Points", zh: "点数" }),
            position: "insideBottom",
            offset: -2,
            fill: "#3e4a43",
            fontSize: 11,
          }}
        />
        <YAxis
          tick={{ fill: "#3e4a43", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip
          contentStyle={{
            background: "#fffdf8",
            border: "1px solid #ddd3c3",
            borderRadius: 8,
            fontSize: 13,
          }}
          formatter={(value: number) => [
            `${value} ${tr(lang, { en: "credits", zh: "学分" })}`,
            tr(lang, { en: "Credits", zh: "学分" }),
          ]}
          labelFormatter={(label) => `${tr(lang, { en: "Points", zh: "点数" })} ${label}`}
        />
        <Bar dataKey="credits" radius={[6, 6, 0, 0]}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
