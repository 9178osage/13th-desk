/**
 * 1080×1920 lock-screen PNG of the week. Loaded with import() on click only
 * (week-schedule.tsx) and draws on a detached canvas that never enters the
 * DOM, so the page itself never has a <canvas> (see scripts/brand-check.mjs).
 */
import type { ScheduleBlock, WeekDay } from "@/lib/store";

export type LockScreenLabels = {
  title: string;
  subtitle: string;
  days: Record<WeekDay, string>;
};

const W = 1080;
const H = 1920;
const PAPER = "#f5f3ed";
const CARD = "#fffefa";
const INK = "#172b43";
const MUTED = "#5f6a76";
const LINE = "#e1e2dc";
const BLUE = "#285be7";
const GOLD = "#825416";
const FONT = `"Outfit", "PingFang SC", "Hiragino Sans", "Malgun Gothic", system-ui, sans-serif`;
const DISPLAY = `"Fraunces", "PingFang SC", "Hiragino Sans", "Malgun Gothic", serif`;
const DAYS: WeekDay[] = ["mon", "tue", "wed", "thu", "fri"];

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Wrap by words, or by characters for CJK text without spaces. Exported (and
 * canvas-only, no DOM) so desk.test.ts can pin the ellipsis behaviour: a title
 * that does not fit must never lose its tail silently.
 */
export function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, maxLines: number) {
  const tokens = /\s/.test(text) ? text.split(/(\s+)/) : [...text];
  const lines: string[] = [];
  let line = "";
  // Track the overflow while wrapping instead of comparing character counts after
  // the fact: `lines.join(" ")` inserts separator spaces a CJK title never had, so
  // the old length test read "fits" and the last line lost its tail with no
  // ellipsis (线性代数与微分方程 rendered as 线性代数 / 与微分方).
  let truncated = false;
  for (const token of tokens) {
    const next = line + token;
    if (ctx.measureText(next).width <= width || !line) {
      line = next;
      continue;
    }
    lines.push(line.trim());
    line = token.trimStart();
    if (lines.length === maxLines) {
      truncated = true;
      break;
    }
  }
  if (!truncated && line.trim()) lines.push(line.trim());
  if (truncated) {
    let last = lines[maxLines - 1];
    while (last && ctx.measureText(last + "…").width > width) last = last.slice(0, -1);
    lines[maxLines - 1] = last + "…";
  }
  return lines;
}

export async function drawLockScreen(
  schedule: ScheduleBlock[],
  labels: LockScreenLabels,
): Promise<Blob> {
  if (typeof document !== "undefined" && document.fonts?.ready) await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  // Top ~560px stays empty for the phone's own lock-screen clock.
  const left = 64;
  const top = 600;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = GOLD;
  ctx.font = `600 30px ${FONT}`;
  ctx.fillText(labels.subtitle.toUpperCase(), left, top);
  ctx.fillStyle = INK;
  ctx.font = `500 68px ${DISPLAY}`;
  ctx.fillText(labels.title, left, top + 82);

  const gridTop = top + 140;
  const gridBottom = H - 190;
  const gap = 14;
  const colW = (W - left * 2 - gap * 4) / 5;
  const byDay = DAYS.map((day) =>
    schedule.filter((row) => row.day === day).sort((a, b) => a.start.localeCompare(b.start)),
  );
  const most = Math.max(1, ...byDay.map((rows) => rows.length));
  const headerH = 64;
  const cardH = Math.min(230, (gridBottom - gridTop - headerH - gap * (most - 1)) / most);

  DAYS.forEach((day, i) => {
    const x = left + i * (colW + gap);
    ctx.fillStyle = MUTED;
    ctx.font = `600 30px ${FONT}`;
    ctx.fillText(labels.days[day], x + 6, gridTop + 36);
    ctx.fillStyle = LINE;
    ctx.fillRect(x, gridTop + headerH - 14, colW, 2);
    byDay[i].forEach((row, j) => {
      const y = gridTop + headerH + j * (cardH + gap);
      roundRect(ctx, x, y, colW, cardH, 18);
      ctx.fillStyle = row.pinned ? BLUE : CARD;
      ctx.fill();
      if (!row.pinned) {
        ctx.strokeStyle = LINE;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      const pad = 16;
      const inner = colW - pad * 2;
      ctx.fillStyle = row.pinned ? "#eaf0ff" : MUTED;
      ctx.font = `500 ${cardH < 120 ? 22 : 26}px ${FONT}`;
      ctx.fillText(row.start, x + pad, y + 38);
      if (cardH >= 120) ctx.fillText(row.end, x + pad, y + 68);
      ctx.fillStyle = row.pinned ? "#ffffff" : INK;
      const size = cardH < 120 ? 24 : 28;
      ctx.font = `600 ${size}px ${FONT}`;
      const titleTop = y + (cardH < 120 ? 70 : 108);
      const room = Math.max(1, Math.floor((y + cardH - pad - titleTop + size) / (size + 6)));
      wrap(ctx, row.title, inner, Math.min(room, 3)).forEach((line, k) => {
        ctx.fillText(line, x + pad, titleTop + k * (size + 6));
      });
    });
  });

  ctx.fillStyle = MUTED;
  ctx.font = `500 28px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("Eugene Desk · eugene-desk.vercel.app", W / 2, H - 96);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob"))), "image/png");
  });
}

export function downloadPng(blob: Blob, filename = "eugene-desk-lock-screen.png") {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
