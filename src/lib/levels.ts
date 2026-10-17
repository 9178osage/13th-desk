/** The single registry shared by UI, storage, backup, boot and cookie handling. */
export const LEVELS = [
  { id: "elem", en: "Elementary", zh: "小学", shortEn: "K–5" },
  { id: "mid", en: "Middle", zh: "初中", shortEn: "6–8" },
  { id: "high", en: "High", zh: "高中", shortEn: "9–12" },
  { id: "uni", en: "University", zh: "大学", shortEn: "Univ" },
] as const;

export type Level = (typeof LEVELS)[number]["id"];
export const LEVEL_IDS = Object.freeze(LEVELS.map((item) => item.id));

export function isLevel(value: unknown): value is Level {
  return (LEVEL_IDS as readonly unknown[]).includes(value);
}
