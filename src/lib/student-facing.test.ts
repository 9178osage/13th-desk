/**
 * Audit 2026-11-27: multi-day breaks (P2-02), the weather error after an expired cache
 * (P2-03), the home "Saved" card (P2-05) and the target GPA planner (P2-06).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { deadlinePassed, lastDayOf } from "./deadline-days.ts";
import { buildIcs } from "./ics.ts";
import { deadlines as uniDeadlines } from "../data/guide.ts";
import { deadlinesFor } from "../data/k12.ts";
import { places, savedPlacesFor } from "../data/places.ts";
import { targetGpaEstimate, targetOutlook } from "./gpa.ts";
import { weatherFailureShown } from "./forecast-age.ts";

const clock = (ymd: string, minutes = 12 * 60) => ({ ymd, minutes });
const vevents = (ics: string) => ics.split("BEGIN:VEVENT").slice(1);
const field = (event: string, name: string) =>
  new RegExp(`^${name}[^:]*:(.+)$`, "m").exec(event)?.[1]?.trim();

test("P2-02: Thanksgiving exports both days and stays listed through November 27", () => {
  const thanks = uniDeadlines.find((item) => item.id === "thanks")!;
  assert.equal(thanks.ymd, "2026-11-26");
  assert.equal(thanks.endYmd, "2026-11-27", "UO registrar: November 26–27");
  const [event] = vevents(
    buildIcs([{ id: thanks.id, ymd: thanks.ymd, endYmd: thanks.endYmd, title: "T" }]),
  );
  assert.equal(field(event, "DTSTART"), "20261126");
  assert.equal(field(event, "DTEND"), "20261128", "all-day DTEND is exclusive (RFC 5545)");
  for (const day of ["2026-11-25", "2026-11-26", "2026-11-27"]) {
    assert.equal(deadlinePassed(thanks, clock(day)), false, day);
    assert.ok(
      uniDeadlines
        .filter((item) => !deadlinePassed(item, clock(day)))
        .some((item) => item.id === "thanks"),
      day,
    );
  }
  assert.equal(deadlinePassed(thanks, clock("2026-11-28")), true);
  assert.ok(
    !uniDeadlines
      .filter((item) => !deadlinePassed(item, clock("2026-11-28")))
      .some((item) => item.id === "thanks"),
  );
});

test("P2-02: single days, a month boundary and a year boundary", () => {
  // Single-day milestone: unchanged semantics.
  const single = { id: "x", ymd: "2026-10-05", title: "Add" };
  const [one] = vevents(buildIcs([single]));
  assert.equal(field(one, "DTEND"), "20261006");
  assert.equal(lastDayOf(single), "2026-10-05");
  assert.equal(deadlinePassed(single, clock("2026-10-06")), true);
  // Timed single day still ends at its time.
  assert.equal(
    deadlinePassed({ ymd: "2026-09-30", time: "09:00" }, clock("2026-09-30", 9 * 60)),
    true,
  );
  // Month boundary.
  const [month] = vevents(
    buildIcs([{ id: "m", ymd: "2026-11-30", endYmd: "2026-12-01", title: "M" }]),
  );
  assert.equal(field(month, "DTEND"), "20261202");
  // 4J winter break crosses the year.
  const winter = deadlinesFor("high").find((item) => item.id === "k-winter")!;
  assert.equal(winter.endYmd, "2027-01-04");
  const [year] = vevents(
    buildIcs([{ id: winter.id, ymd: winter.ymd, endYmd: winter.endYmd, title: "W" }]),
  );
  assert.equal(field(year, "DTSTART"), "20261221");
  assert.equal(field(year, "DTEND"), "20270105");
  assert.equal(deadlinePassed(winter, clock("2027-01-04")), false, "last day still listed");
  assert.equal(deadlinePassed(winter, clock("2027-01-05")), true);
  // A bad or reversed end day falls back to the single day.
  const [bad] = vevents(
    buildIcs([{ id: "b", ymd: "2026-11-26", endYmd: "2026-11-20", title: "B" }]),
  );
  assert.equal(field(bad, "DTEND"), "20261127");
});

test("P2-02: every multi-day break is marked with its last day", () => {
  const spans = [
    ...uniDeadlines.filter((item) => item.endYmd),
    ...deadlinesFor("high").filter((item) => item.endYmd),
  ].map((item) => `${item.id}:${item.ymd}..${item.endYmd}`);
  assert.deepEqual(spans.sort(), [
    "k-conf:2026-11-23..2026-11-27",
    "k-spring:2027-03-22..2027-03-29",
    "k-winter:2026-12-21..2027-01-04",
    "thanks:2026-11-26..2026-11-27",
    "w-spring:2027-03-20..2027-03-28",
  ]);
  for (const item of [...uniDeadlines, ...deadlinesFor("elem")]) {
    if (item.endYmd) assert.ok(item.endYmd > item.ymd, item.id);
  }
});

test("P2-03: an expired cache never hides the weather error and its retry button", () => {
  assert.equal(weatherFailureShown(false), true, "nothing on screen: show error + Try again");
  assert.equal(weatherFailureShown(true), false, "a shown forecast stays on a failed refresh");
  const source = readFileSync(join(import.meta.dirname, "../components/weather.tsx"), "utf8");
  assert.match(source, /weatherFailureShown\(shownRef\.current\)/);
  assert.doesNotMatch(source, /!gone && !lastForecast\) setFailed/);
});

test("P2-05: the home Saved count and the Saved list cover the same places", () => {
  const campus = places.find((place) => place.page === "campus" && place.name.includes("Knight"))!;
  const town = places.find((place) => place.page === "town")!;
  assert.ok(campus && town);
  assert.deepEqual(
    savedPlacesFor([campus.id], "uni").map((p) => p.id),
    [campus.id],
    "campus only",
  );
  assert.deepEqual(
    savedPlacesFor([town.id], "uni").map((p) => p.id),
    [town.id],
    "town only",
  );
  assert.equal(savedPlacesFor([campus.id, town.id], "uni").length, 2, "mixed");
  assert.equal(savedPlacesFor([], "uni").length, 0, "empty");
  assert.equal(savedPlacesFor(["no-such-place"], "uni").length, 0, "stale ids are not counted");
  const home = readFileSync(join(import.meta.dirname, "../components/home-dashboard.tsx"), "utf8");
  assert.match(home, /savedPlacesFor\(bucket\.favs, level\)\.length/);
  assert.match(home, /search=\{savedCount > 0 \? \{ cat: "saved" \} : \{\}\}/);
  const browser = readFileSync(
    join(import.meta.dirname, "../components/place-browser.tsx"),
    "utf8",
  );
  assert.match(browser, /cat === "saved"\s*\?\s*savedPlacesFor\(favs, level\)/);
});

test("P2-06: meeting the target now still shows what the next credits need", () => {
  const prior = { gpa: null, weighted: null, credits: null };
  // 4 credits of A, 4 more credits, target 3.50: at least 3.00 on the next credits.
  const met = targetGpaEstimate(
    "uni",
    [{ grade: "A", credits: 4, boost: false }],
    prior,
    "3.50",
    "4",
  );
  assert.equal(met.met, true);
  assert.equal(met.needed, 3);
  assert.equal(targetOutlook(met), "keep-min");
  // Exactly at the target: the next credits must match it.
  const exact = targetGpaEstimate(
    "uni",
    [{ grade: "B", credits: 4, boost: false }],
    prior,
    "3.00",
    "4",
  );
  assert.equal(exact.met, true);
  assert.equal(targetOutlook(exact), "keep-min");
  assert.equal(exact.needed, 3);
  // Far above with few future credits: any grade keeps it.
  const easy = targetGpaEstimate(
    "uni",
    Array.from({ length: 5 }, () => ({ grade: "A" as const, credits: 5, boost: false })),
    prior,
    "0.50",
    "1",
  );
  assert.equal(targetOutlook(easy), "keep-any");
  // Out of reach.
  const hard = targetGpaEstimate(
    "uni",
    Array.from({ length: 5 }, () => ({ grade: "D" as const, credits: 5, boost: false })),
    prior,
    "4.00",
    "1",
  );
  assert.equal(targetOutlook(hard), "out-of-reach");
  // Weighted high school.
  const weighted = targetGpaEstimate(
    "high",
    [{ grade: "A", credits: 1, boost: true }],
    prior,
    "4.50",
    "1",
  );
  assert.equal(weighted.weighted, true);
  assert.equal(targetOutlook(weighted), "keep-min");
  assert.equal(targetOutlook({ ceiling: 4, needed: null, met: false }), "unknown");
  const page = readFileSync(join(import.meta.dirname, "../routes/gpa.tsx"), "utf8");
  assert.match(page, /whatIfMet && whatIfHint != null/);
  assert.match(page, /targetOutlook\(estimate\) === "keep-any"/);
});
