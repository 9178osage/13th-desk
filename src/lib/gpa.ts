import type { Level } from "@/lib/levels";

export const LETTERS = [
  "A+",
  "A",
  "A-",
  "B+",
  "B",
  "B-",
  "C+",
  "C",
  "C-",
  "D+",
  "D",
  "D-",
  "F",
] as const;

export type Letter = (typeof LETTERS)[number];

const COLLEGE: Record<Letter, number> = {
  "A+": 43,
  A: 40,
  "A-": 37,
  "B+": 33,
  B: 30,
  "B-": 27,
  "C+": 23,
  C: 20,
  "C-": 17,
  "D+": 13,
  D: 10,
  "D-": 7,
  F: 0,
};

const SCHOOL: Record<Letter, number> = {
  "A+": 40,
  A: 40,
  "A-": 40,
  "B+": 30,
  B: 30,
  "B-": 30,
  "C+": 20,
  C: 20,
  "C-": 20,
  "D+": 10,
  D: 10,
  "D-": 10,
  F: 0,
};

const SCHOOL_BOOST: Record<Letter, number> = {
  "A+": 50,
  A: 50,
  "A-": 50,
  "B+": 40,
  B: 40,
  "B-": 40,
  "C+": 30,
  C: 30,
  "C-": 30,
  "D+": 20,
  D: 20,
  "D-": 20,
  F: 0,
};

export function isLetter(value: unknown): value is Letter {
  return typeof value === "string" && (LETTERS as readonly string[]).includes(value);
}

export function cleanDecimal(value: unknown, maxLen: number): string {
  if (typeof value !== "string") return "";
  // Keep invalid input visible so validation can explain it. Never turn -3 into 3.
  return value.trim().slice(0, maxLen);
}

export function asStoredCredits(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const hundredths = Math.round(value * 100);
  if (Math.abs(value * 100 - hundredths) > 1e-6) return null;
  if (hundredths < 50 || hundredths > 1000 || hundredths % 50 !== 0) return null;
  return hundredths / 100;
}

function toHundredths(raw: string): number | null {
  if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(raw)) return null;
  const [whole, frac = ""] = raw.split(".");
  const n = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  return Number.isInteger(n) ? n : null;
}

export function parseGpaInput(raw: string, maxHundredths = 500): number | null {
  const t = raw.trim();
  if (!/^(?:[0-4](?:\.\d{1,2})?|5(?:\.00?)?)$/.test(t)) return null;
  const hundredths = toHundredths(t);
  if (hundredths == null || hundredths > maxHundredths) return null;
  return hundredths;
}

export function parseCredits(raw: string, maxHundredths: number): number | null {
  const hundredths = toHundredths(raw.trim());
  if (
    hundredths == null ||
    hundredths < 50 ||
    hundredths > maxHundredths ||
    hundredths % 50 !== 0
  ) {
    return null;
  }
  return hundredths;
}

export function creditChoices(level: Level): string[] {
  if (level === "uni") return ["0.5", "1", "2", "3", "4", "5"];
  if (level === "elem") return ["1"];
  return ["0.5", "1", "1.5", "2"];
}

export function defaultCredits(level: Level): string {
  if (level === "uni") return "4";
  if (level === "elem") return "1";
  return "0.5";
}

export type GpaInput = {
  grade: Letter;
  credits: number;
  boost: boolean;
};

export function pointsTenths(level: Level, row: GpaInput, weighted: boolean): number {
  if (level === "uni") return COLLEGE[row.grade];
  if (level === "high" && weighted && row.boost) return SCHOOL_BOOST[row.grade];
  return SCHOOL[row.grade];
}

export type GpaFigure = {
  gpaHundredths: number;
  creditHundredths: number;
};

function roundRatio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  const whole = Math.floor(numerator / denominator);
  const rem = numerator % denominator;
  return rem * 2 >= denominator ? whole + 1 : whole;
}

function figureFrom(points10k: number, creditHundredths: number): GpaFigure | null {
  const gpaHundredths = roundRatio(points10k, creditHundredths);
  if (gpaHundredths == null) return null;
  return { gpaHundredths, creditHundredths };
}

export function listGpa(level: Level, rows: GpaInput[], weighted: boolean): GpaFigure | null {
  let points10k = 0;
  let creditHundredths = 0;
  for (const row of rows) {
    const credits = asStoredCredits(row.credits);
    if (credits == null) continue;
    const hundredths = Math.round(credits * 100);
    points10k += pointsTenths(level, row, weighted) * hundredths * 10;
    creditHundredths += hundredths;
  }
  return figureFrom(points10k, creditHundredths);
}

export function combinedGpa(
  level: Level,
  rows: GpaInput[],
  weighted: boolean,
  priorGpaHundredths: number,
  priorCreditHundredths: number,
): GpaFigure | null {
  const current = listGpa(level, rows, weighted);
  const points10k =
    priorGpaHundredths * priorCreditHundredths + currentPoints(level, rows, weighted);
  return figureFrom(points10k, priorCreditHundredths + (current?.creditHundredths ?? 0));
}

export function currentPoints(level: Level, rows: GpaInput[], weighted: boolean): number {
  let points10k = 0;
  for (const row of rows) {
    const credits = asStoredCredits(row.credits);
    if (credits == null) continue;
    points10k += pointsTenths(level, row, weighted) * Math.round(credits * 100) * 10;
  }
  return points10k;
}

export function formatGpa(gpaHundredths: number): string {
  const n = Math.max(0, Math.round(gpaHundredths));
  return `${Math.floor(n / 100)}.${String(n % 100).padStart(2, "0")}`;
}

export function formatCredits(creditHundredths: number): string {
  const n = creditHundredths / 100;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
