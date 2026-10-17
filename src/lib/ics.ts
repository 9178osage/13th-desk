/**
 * Zero-dependency iCalendar (RFC 5545) export for desk dates. Pure string
 * building (tested in desk.test.ts); `downloadIcs` is the only browser part.
 */
import { isCalendarDay as validYmd } from "./days.ts";

export type IcsEvent = {
  id: string;
  /** Eugene calendar day, YYYY-MM-DD. */
  ymd: string;
  /** Optional Eugene wall-clock time, HH:MM (24h). Without it the event is all-day. */
  time?: string;
  title: string;
  detail?: string;
  url?: string;
};

export const ICS_FILENAME = "eugene-desk-calendar.ics";
const TZID = "America/Los_Angeles";

// US Pacific rules since 2007; enough for clients that want the zone spelled out.
const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  `TZID:${TZID}`,
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:-0800",
  "TZOFFSETTO:-0700",
  "TZNAME:PDT",
  "DTSTART:20070311T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:-0700",
  "TZOFFSETTO:-0800",
  "TZNAME:PST",
  "DTSTART:20071104T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

/** Escape TEXT values: backslash, semicolon, comma, newline. */
export function icsEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** Fold a content line to at most 75 UTF-8 octets per physical line. */
export function icsFold(line: string): string {
  const encoder = new TextEncoder();
  const out: string[] = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space
    if (bytes + size > limit) {
      out.push(current);
      current = "";
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

const pad = (n: number) => String(n).padStart(2, "0");

function nextDay(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function stamp(now: Date): string {
  return (
    `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
    `T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`
  );
}

function validTime(hm: string | undefined): hm is string {
  return !!hm && /^([01]\d|2[0-3]):[0-5]\d$/.test(hm);
}

/** Build one VCALENDAR (CRLF line endings) for one or many events. */
export function buildIcs(events: IcsEvent[], now = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Eugene Desk//eugene-desk.vercel.app//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Eugene Desk",
  ];
  const timed = events.some((event) => validTime(event.time));
  if (timed) lines.push(...VTIMEZONE);
  for (const event of events) {
    if (!validYmd(event.ymd)) continue;
    const day = event.ymd.replace(/-/g, "");
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${event.id.replace(/[^\w.-]/g, "-")}-${day}@eugene-desk.vercel.app`);
    lines.push(`DTSTAMP:${stamp(now)}`);
    if (validTime(event.time)) {
      const [h, m] = event.time.split(":").map(Number);
      const endMin = Math.min(h * 60 + m + 30, 23 * 60 + 59);
      lines.push(`DTSTART;TZID=${TZID}:${day}T${pad(h)}${pad(m)}00`);
      lines.push(`DTEND;TZID=${TZID}:${day}T${pad(Math.floor(endMin / 60))}${pad(endMin % 60)}00`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${day}`);
      lines.push(`DTEND;VALUE=DATE:${nextDay(event.ymd).replace(/-/g, "")}`);
    }
    lines.push(`SUMMARY:${icsEscape(event.title)}`);
    if (event.detail) lines.push(`DESCRIPTION:${icsEscape(event.detail)}`);
    if (event.url) lines.push(`URL:${event.url}`);
    lines.push("TRANSP:TRANSPARENT");
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(icsFold).join("\r\n") + "\r\n";
}

/** Browser only: save the calendar text as a file. */
export function downloadIcs(text: string, filename = ICS_FILENAME): void {
  const url = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
