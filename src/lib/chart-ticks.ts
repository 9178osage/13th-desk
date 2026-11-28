/** Integer y-axis ticks (0 … top) with a 1/2/5 × 10ⁿ step, about four lines. */
export function chartTicks(max: number): number[] {
  const safe = Number.isFinite(max) && max > 0 ? max : 1;
  const rough = safe / 4;
  const base = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * base).find((s) => s >= rough) ?? base);
  const top = Math.ceil(safe / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

/**
 * Where the tooltip's left edge goes: centred over the bar, but kept inside the chart so a
 * long translated label never runs off a narrow phone screen (audit 2026-11-28 P2-04).
 */
export function tooltipLeft(center: number, tipWidth: number, chartWidth: number): number {
  const max = Math.max(0, chartWidth - tipWidth);
  return Math.min(Math.max(0, center - tipWidth / 2), max);
}
