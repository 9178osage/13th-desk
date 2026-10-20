import { test } from "node:test";
import assert from "node:assert/strict";
import { rolldown } from "rolldown";
import { createRequire } from "node:module";

test("real date display preserves six-language output while reusing formatters", async (t) => {
  const bundle = await rolldown({
    input: "src/lib/time.ts",
    platform: "node",
    tsconfig: "tsconfig.json",
    resolve: { alias: { "@": process.cwd() + "/src" } },
  });
  const output = await bundle.generate({ format: "cjs", codeSplitting: false });
  await bundle.close();
  let constructions = 0;
  const trackedIntl = Object.create(Intl);
  trackedIntl.DateTimeFormat = function (...args) {
    constructions++;
    return new Intl.DateTimeFormat(...args);
  };
  const module = { exports: {} };
  new Function(
    "require",
    "module",
    "exports",
    "Intl",
    output.output.find((item) => item.type === "chunk").code,
  )(createRequire(import.meta.url), module, module.exports, trackedIntl);
  const { formatWhen, formatDateline, eugeneClock } = module.exports;
  const locales = { en: "en-US", zh: "zh-CN", es: "es", ko: "ko", vi: "vi", ja: "ja" };
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const viWeekdays = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  const dates = [
    "2026-01-01T07:59:00Z",
    "2026-01-01T08:00:00Z",
    "2024-02-29T20:00:00Z",
    "2026-03-08T09:59:00Z",
    "2026-03-08T10:01:00Z",
    "2026-11-01T08:59:00Z",
    "2026-11-01T09:01:00Z",
    "2026-10-20T21:00:00Z",
  ].map((iso) => new Date(iso));
  await t.test("invalid dates remain harmless", () => {
    for (const lang of Object.keys(locales)) {
      for (const invalid of ["2026-13-01", "2026-02-31", "2026-02-29", "2026-1-01", ""])
        assert.equal(formatWhen(invalid, "2026-02-28", lang), "—", `${lang} ${invalid}`);
      assert.ok(formatWhen("2024-02-29", "2024-02-28", lang));
      assert.equal(
        formatWhen("2026-10-17", "invalid today", lang),
        formatWhen("2026-10-17", "2026-10-01", lang),
      );
    }
  });
  await t.test("winter, summer, leap days, midnight and DST match fresh formatters", () => {
    for (const now of dates) {
      const parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Los_Angeles",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        })
          .formatToParts(now)
          .map((p) => [p.type, p.value]),
      );
      const hour = Number(parts.hour) % 24;
      const ymd = `${parts.year}-${parts.month}-${parts.day}`;
      assert.deepEqual(eugeneClock(now), {
        ymd,
        weekday: weekdays.indexOf(parts.weekday),
        minutes: hour * 60 + Number(parts.minute),
        month: Number(parts.month),
        hour,
      });
      for (const [lang, locale] of Object.entries(locales)) {
        assert.equal(
          formatDateline(now, lang),
          new Intl.DateTimeFormat(locale, {
            timeZone: "America/Los_Angeles",
            weekday: "long",
            month: "long",
            day: "numeric",
          }).format(now),
        );
        const noon = new Date(`${ymd}T12:00:00-07:00`);
        const formatter = new Intl.DateTimeFormat(locale, {
          timeZone: "America/Los_Angeles",
          weekday: "short",
          month: "short",
          day: "numeric",
        });
        const weekday = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Los_Angeles",
          weekday: "short",
        }).format(noon);
        const expected =
          lang === "vi"
            ? formatter
                .formatToParts(noon)
                .map((part) =>
                  part.type === "weekday" ? viWeekdays[weekdays.indexOf(weekday)] : part.value,
                )
                .join("")
            : formatter.format(noon);
        assert.equal(formatWhen(ymd, "2000-01-01", lang), expected);
      }
    }
  });
  await t.test(
    "repeated ticks and alternating languages create no more formatters after warmup",
    () => {
      assert.equal(
        constructions,
        14,
        "one clock, six long/short formats, one Vietnamese weekday helper",
      );
      const before = constructions;
      for (let tick = 0; tick < 20; tick++)
        for (const lang of Object.keys(locales)) {
          eugeneClock(dates[tick % dates.length]);
          formatDateline(dates[tick % dates.length], lang);
          formatWhen("2026-10-20", "2000-01-01", lang);
        }
      assert.equal(constructions, before);
    },
  );
});
