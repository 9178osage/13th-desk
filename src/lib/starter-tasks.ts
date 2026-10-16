import { checklist } from "../data/guide.ts";
import { k12Checks } from "../data/k12.ts";
import type { Copy } from "@/lib/text";
import type { Level } from "@/lib/levels";
import type { DistrictId } from "@/data/districts";

type Starter = { id: string; label: Copy; until?: string; district?: "4j" };

/** Shared by the homepage and the full guide; keep completed IDs in storage. */
export function applicableChecks<T extends Pick<Starter, "until" | "district">>(
  pool: T[], district: DistrictId | null, todayYmd: string | null,
): T[] {
  return pool
    .filter((item) => !(item.until && todayYmd && todayYmd > item.until))
    .filter((item) => !(item.district === "4j" && district !== null && district !== "4j"));
}

/** Preferred UO starters, then the rest of the checklist in order. */
const UNI_FIRST = ["schedule", "knight", "bus"];

/**
 * Up to three one-tap tasks for an empty list (audit 10-15 P2): skip items whose
 * `until` date has passed in Eugene, and 4J-only items when another district is
 * chosen (no district yet still means the 4J defaults the rest of the page uses).
 */
export function starterTasks(level: Level, district: DistrictId | null, todayYmd: string | null, count = 3): Starter[] {
  const pool: Starter[] =
    level === "uni"
      ? [
          ...UNI_FIRST.map((id) => checklist.find((item) => item.id === id)).filter((item) => !!item),
          ...checklist.filter((item) => !UNI_FIRST.includes(item.id)),
        ]
      : k12Checks[level];
  return applicableChecks(pool, district, todayYmd).slice(0, count);
}
