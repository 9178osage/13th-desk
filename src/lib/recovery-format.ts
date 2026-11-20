/**
 * Recovery copies: a desk value this browser kept aside instead of losing it, stored under
 * `13th-desk-v1:recovery:<id>`. Since 2026-11-20 each copy is wrapped with when and why it
 * was made; the original bytes are kept verbatim in `raw` (they may not even be JSON, for
 * an unreadable save that an import replaced). Copies written earlier are the bare saved
 * value and are still read: their time and reason are simply unknown.
 *
 * Kept free of other imports: `desk-storage.ts` writes copies with it.
 */
export const RECOVERY_PREFIX = "13th-desk-v1:recovery:" as const;
/** Dispatched on `window` when this tab adds or removes a copy (storage events cover others). */
export const RECOVERY_EVENT = "eugene-desk-recovery" as const;

/**
 * Why a copy exists.
 * - `conflict`: another tab saved over this tab's write (browser without Web Locks).
 * - `unreadable`: an unreadable save that an import or restore replaced.
 * - `old-tab`: an older version of the app saved in another tab; this tab's desk was kept.
 * - `identity`: a save whose item ids could not be trusted; it was kept before repair.
 */
export const RECOVERY_SOURCES = ["conflict", "unreadable", "old-tab", "identity"] as const;
export type RecoverySource = (typeof RECOVERY_SOURCES)[number];

export type RecoveryEnvelope = {
  eugeneDeskRecovery: 1;
  createdAt: string;
  source: RecoverySource;
  raw: string;
};

export type UnwrappedRecovery = {
  /** ISO time the copy was made, or null for a copy from before metadata existed. */
  createdAt: string | null;
  source: RecoverySource | "unknown";
  /** The kept value exactly as it was stored. */
  raw: string;
};

function isSource(value: unknown): value is RecoverySource {
  return RECOVERY_SOURCES.includes(value as RecoverySource);
}

export function wrapRecoveryCopy(raw: string, source: RecoverySource, now = new Date()): string {
  const envelope: RecoveryEnvelope = {
    eugeneDeskRecovery: 1,
    createdAt: now.toISOString(),
    source,
    raw,
  };
  return JSON.stringify(envelope);
}

/** Read a stored copy. Anything that is not an envelope is a legacy bare copy. */
export function unwrapRecoveryCopy(stored: string): UnwrappedRecovery {
  try {
    const value = JSON.parse(stored) as Partial<RecoveryEnvelope> | null;
    if (
      value &&
      typeof value === "object" &&
      value.eugeneDeskRecovery === 1 &&
      typeof value.raw === "string"
    ) {
      const time = typeof value.createdAt === "string" ? Date.parse(value.createdAt) : NaN;
      return {
        createdAt: Number.isNaN(time) ? null : new Date(time).toISOString(),
        source: isSource(value.source) ? value.source : "unknown",
        raw: value.raw,
      };
    }
  } catch {
    /* not JSON: a legacy copy of an unreadable save */
  }
  return { createdAt: null, source: "unknown", raw: stored };
}

export function newRecoveryId(): string {
  const id = globalThis.crypto?.randomUUID?.();
  return id ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isRecoveryKey(key: string | null): key is string {
  return typeof key === "string" && key.startsWith(RECOVERY_PREFIX);
}
