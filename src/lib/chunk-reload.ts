/**
 * A tab opened before a deploy still asks for the previous build's hashed chunks,
 * which the new deployment no longer serves (Vercel Skew Protection needs a paid
 * plan). On `vite:preloadError`, offer one reload to pick up the current build.
 * Never refresh silently: even a background prefetch can fail while a form has
 * unsaved input.
 */

// TanStack Router's lazyRouteComponent records its own one-time reload under this
// prefix plus the error message. Sharing it keeps a missing route chunk to a single
// reload in total instead of one from each handler.
export const RELOAD_KEY_PREFIX = "tanstack_router_reload:";

const MISSING_CHUNK = [
  "Failed to fetch dynamically imported module", // Chromium
  "error loading dynamically imported module", // Firefox
  "Importing a module script failed", // Safari
  "Unable to preload CSS", // Vite's CSS preload for a chunk
];

export function isMissingChunk(error: unknown): error is Error {
  const message = error instanceof Error ? error.message : "";
  return MISSING_CHUNK.some((start) => message.startsWith(start));
}

export interface ReloadEnv {
  storage: Pick<Storage, "getItem" | "setItem"> | null;
  online: boolean;
  confirmReload: () => boolean;
  reload: () => void;
}

/** Reloads at most once per missing chunk; returns whether it started a reload. */
export function reloadForMissingChunk(error: unknown, env: ReloadEnv): boolean {
  // Offline, a reload would trade the open desk for the browser's error page.
  if (!isMissingChunk(error) || !env.online || !env.storage) return false;
  const key = RELOAD_KEY_PREFIX + error.message;
  try {
    if (env.storage.getItem(key)) return false;
    env.storage.setItem(key, "1");
  } catch {
    // Without a record, a chunk that is really gone would reload forever.
    return false;
  }
  // Record the decision before prompting so TanStack cannot override a refusal.
  if (!env.confirmReload()) return false;
  env.reload();
  return true;
}

export interface ChunkReloadHost {
  addEventListener(type: string, listener: (event: Event) => void): void;
  removeEventListener(type: string, listener: (event: Event) => void): void;
  readonly sessionStorage: Pick<Storage, "getItem" | "setItem">;
  readonly navigator: { readonly onLine: boolean };
  readonly location: { reload(): void };
  confirm(message: string): boolean;
}

export function installChunkReload(host: ChunkReloadHost, message: string): () => void {
  const onPreloadError = (event: Event) => {
    let storage: ReloadEnv["storage"] = null;
    try {
      storage = host.sessionStorage;
    } catch {
      /* storage blocked: never reload without a loop guard */
    }
    reloadForMissingChunk((event as Event & { payload?: unknown }).payload, {
      storage,
      online: host.navigator.onLine !== false,
      confirmReload: () => host.confirm(message),
      reload: () => host.location.reload(),
    });
  };
  host.addEventListener("vite:preloadError", onPreloadError);
  return () => host.removeEventListener("vite:preloadError", onPreloadError);
}
