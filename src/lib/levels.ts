export type Level = "elem" | "mid" | "high" | "uni";

export const LEVELS: { id: Level; en: string; zh: string; shortEn: string }[] = [
  { id: "elem", en: "Elementary", zh: "小学", shortEn: "K–5" },
  { id: "mid", en: "Middle", zh: "初中", shortEn: "6–8" },
  { id: "high", en: "High", zh: "高中", shortEn: "9–12" },
  { id: "uni", en: "University", zh: "大学", shortEn: "Univ" },
];

export function isLevel(value: unknown): value is Level {
  return value === "elem" || value === "mid" || value === "high" || value === "uni";
}
