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
