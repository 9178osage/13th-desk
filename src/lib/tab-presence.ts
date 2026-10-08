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
};

const PREFIX = "13th-desk-v1:tab:";
export const PRESENCE_HEARTBEAT_MS = 15_000;
export const PRESENCE_EXPIRE_MS = 40_000;
const RECHECK_MS = [300, 1500];

export function createTabPresence(env: TabPresenceEnvironment) {
  const now = env.now ?? Date.now;
  const peers = new Map<string, number>();
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
    try { env.channel?.postMessage({ type, id: env.id }); } catch { /* channel closed */ }
  };

  env.channel?.addEventListener("message", (event) => {
    const data = event.data as { type?: unknown; id?: unknown } | null;
    if (!data || typeof data.id !== "string" || data.id === env.id) return;
    if (data.type === "bye") peers.delete(data.id);
    else if (data.type === "hello" || data.type === "here") {
      peers.set(data.id, now());
      if (data.type === "hello") post("here");
    }
    refresh();
    // Lock requests and releases travel separately from channel messages: a new
    // tab's lock can land just after its "hello", a closing tab's just after "bye".
    if (canQuery) for (const delay of RECHECK_MS) setTimeout(refresh, delay);
  });

  if (canQuery) {
    env.locks!.request(own, () => new Promise<void>((resolve) => { release = resolve; }))
      .catch(() => {});
  }
  post("hello");
  refresh();
  const timer = env.setInterval?.(() => { post("here"); refresh(); }, PRESENCE_HEARTBEAT_MS);

  return {
    /** Page shown again (tab focus, back/forward cache). */
    wake() { post("hello"); refresh(); },
    /** Page going away: tell the others now rather than waiting for expiry. */
    leave() { post("bye"); },
    refresh,
    dispose() {
      if (disposed) return;
      post("bye");
      disposed = true;
      if (timer !== undefined) env.clearInterval?.(timer);
      release?.();
      try { env.channel?.close(); } catch { /* ignore */ }
    },
  };
}
