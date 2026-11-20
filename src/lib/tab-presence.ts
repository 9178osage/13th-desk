/**
 * Notices other open Eugene Desk tabs on this browser so the page can show a
 * gentle "another page is open" notice. Web Locks (held until the tab closes or
 * crashes) give an exact count where `query()` exists; BroadcastChannel
 * hello/here/bye with a heartbeat is the fallback. Neither: never warns.
 */
type Channel = {
  postMessage(message: unknown): void;
  addEventListener(type: "message", listener: (event: { data: unknown }) => void): void;
  close(): void;
};
export type TabPresenceEnvironment = {
  id: string;
  channel?: Channel | null;
  locks?: Pick<LockManager, "request" | "query"> | null;
  now?: () => number;
  setInterval?: (fn: () => void, ms: number) => unknown;
  clearInterval?: (handle: unknown) => void;
  onChange: (othersOpen: boolean) => void;
  /**
   * This build's identity marker (see `DESK_IDENTITY` in desk-storage.ts), sent with every
   * presence message. Older builds send none, so a peer without it runs an older version.
   */
  identity?: number;
  /** True while at least one open peer tab runs an older version (no `identity`). */
  onOldTabs?: (oldOpen: boolean) => void;
};

const PREFIX = "13th-desk-v1:tab:";
export const PRESENCE_HEARTBEAT_MS = 15_000;
export const PRESENCE_EXPIRE_MS = 40_000;
const RECHECK_MS = [300, 1500];

export function createTabPresence(env: TabPresenceEnvironment) {
  const now = env.now ?? Date.now;
  const peers = new Map<string, number>();
  // Peers that did not announce an identity marker: an older build of the app.
  const oldPeers = new Map<string, number>();
  let reportedOld: boolean | null = null;
  const own = PREFIX + env.id;
  const canQuery = typeof env.locks?.query === "function";
  let lockOthers = false;
  let reported: boolean | null = null;
  let disposed = false;
  let release: (() => void) | undefined;

  const report = () => {
    if (disposed) return;
    const t = now();
    for (const [id, seen] of peers) if (t - seen > PRESENCE_EXPIRE_MS) peers.delete(id);
    for (const [id, seen] of oldPeers) if (t - seen > PRESENCE_EXPIRE_MS) oldPeers.delete(id);
    const old = oldPeers.size > 0;
    if (old !== reportedOld && (old || reportedOld !== null)) {
      reportedOld = old;
      env.onOldTabs?.(old);
    }
    const others = canQuery ? lockOthers : peers.size > 0;
    if (others !== reported) {
      reported = others;
      env.onChange(others);
    }
  };

  const refresh = () => {
    if (!canQuery || disposed) return report();
    env.locks!.query().then((snapshot) => {
      const names = [...(snapshot.held ?? []), ...(snapshot.pending ?? [])]
        .map((lock) => lock.name ?? "")
        .filter((lockName) => lockName.startsWith(PREFIX) && lockName !== own);
      lockOthers = names.length > 0;
      report();
    }, report);
  };

  const post = (type: "hello" | "here" | "bye") => {
    try {
      env.channel?.postMessage(
        env.identity === undefined
          ? { type, id: env.id }
          : { type, id: env.id, identity: env.identity },
      );
    } catch {
      /* channel closed */
    }
  };

  // Lock requests/releases travel separately from channel messages, so each one
  // schedules two rechecks. Track them: a tab that is disposed (or a page that
  // navigates away) must not keep querying locks for work it no longer does.
  const timers = new Set<unknown>();
  const later = (fn: () => void, ms: number) => {
    // `const` (not `let`) so lint stays happy about the reassignment-free handle:
    // the arrow closes over the binding, which is assigned before it can fire.
    const handle = setTimeout(() => {
      timers.delete(handle);
      fn();
    }, ms);
    timers.add(handle);
  };

  env.channel?.addEventListener("message", (event) => {
    const data = event.data as { type?: unknown; id?: unknown; identity?: unknown } | null;
    if (!data || typeof data.id !== "string" || data.id === env.id) return;
    if (data.type === "bye") {
      peers.delete(data.id);
      oldPeers.delete(data.id);
    } else if (data.type === "hello" || data.type === "here") {
      peers.set(data.id, now());
      if (env.identity !== undefined && data.identity === undefined) oldPeers.set(data.id, now());
      else oldPeers.delete(data.id);
      if (data.type === "hello") post("here");
    }
    refresh();
    // Lock requests and releases travel separately from channel messages: a new
    // tab's lock can land just after its "hello", a closing tab's just after "bye".
    if (canQuery) for (const delay of RECHECK_MS) later(refresh, delay);
  });

  if (canQuery) {
    env
      .locks!.request(
        own,
        () =>
          new Promise<void>((resolve) => {
            release = resolve;
          }),
      )
      .catch(() => {});
  }
  post("hello");
  refresh();
  const timer = env.setInterval?.(() => {
    post("here");
    refresh();
  }, PRESENCE_HEARTBEAT_MS);

  return {
    /** Page shown again (tab focus, back/forward cache). */
    wake() {
      post("hello");
      refresh();
    },
    /** Page going away: tell the others now rather than waiting for expiry. */
    leave() {
      post("bye");
    },
    refresh,
    dispose() {
      if (disposed) return;
      post("bye");
      disposed = true;
      for (const handle of timers) clearTimeout(handle as number);
      timers.clear();
      if (timer !== undefined) env.clearInterval?.(timer);
      release?.();
      try {
        env.channel?.close();
      } catch {
        /* ignore */
      }
    },
  };
}
