import { useEffect, useRef, type RefObject } from "react";

const TABBABLE = [
  "a[href]",
  "area[href]",
  "button",
  'input:not([type="hidden"])',
  "select",
  "textarea",
  "iframe",
  "summary",
  "audio[controls]",
  "video[controls]",
  '[contenteditable]:not([contenteditable="false"])',
  "[tabindex]",
].join(", ");

/** What `isTabbable` reads from an element (a narrow shape so tests can fake it). */
export type TabbableCandidate = {
  tabIndex: number;
  matches(selector: string): boolean;
  closest(selector: string): unknown;
  getClientRects(): { length: number };
};

/**
 * Whether Tab can actually land on `item`: in the Tab order, enabled (including through a
 * disabled `<fieldset>`), not inside an `inert` or `hidden` subtree, and rendered. A bare
 * `[href]` match is not enough (a `<link>` or a `<use href>` is never focusable), and a
 * `display: none` or `visibility: hidden` control must not become the wrap-around target
 * (audit 2026-11-28 P2-05).
 */
export function isTabbable(
  item: TabbableCandidate,
  visibility: (item: TabbableCandidate) => string | null = () => null,
): boolean {
  if (item.tabIndex < 0) return false;
  if (item.matches(":disabled")) return false;
  if (item.closest("[inert]") || item.closest("[hidden]")) return false;
  if (item.getClientRects().length === 0) return false;
  const shown = visibility(item);
  return shown !== "hidden" && shown !== "collapse";
}

function computedVisibility(item: TabbableCandidate): string | null {
  if (typeof getComputedStyle !== "function" || typeof Element === "undefined") return null;
  if (!(item instanceof Element)) return null;
  return getComputedStyle(item).visibility;
}

/** Elements Tab can reach inside `panel`, in document order. */
export function tabbableIn(panel: ParentNode): HTMLElement[] {
  return [...panel.querySelectorAll<HTMLElement>(TABBABLE)].filter((item) =>
    isTabbable(item, computedVisibility),
  );
}

/**
 * Where Tab should go instead of the browser default, or null to let it through.
 * Focus on something that is not itself in the Tab order (a `tabIndex=-1` title, the panel)
 * or outside the dialog wraps to the matching end, so the first Shift+Tab can never leave.
 */
export function trappedTabTarget<T>(
  items: readonly T[],
  active: T | null,
  inside: boolean,
  backwards: boolean,
): T | null {
  if (items.length === 0) return null;
  const first = items[0];
  const last = items[items.length - 1];
  const index = active === null ? -1 : items.indexOf(active);
  if (!inside || index === -1) return backwards ? last : first;
  if (backwards && index === 0) return last;
  if (!backwards && index === items.length - 1) return first;
  return null;
}

// Open dialogs, newest last: only the top one reacts to keys.
const stack: object[] = [];

/**
 * Modal keyboard behaviour shared by the backup dialogs: focus moves in when it opens,
 * Tab and Shift+Tab stay inside, Escape (handled on the document, so it works wherever
 * focus is) calls `onEscape`, focus that escapes by other means is pulled back, and focus
 * returns to the control that opened it when it closes.
 */
export function useModalFocus(
  open: boolean,
  panelRef: RefObject<HTMLElement | null>,
  options: {
    initial?: RefObject<HTMLElement | null>;
    /** Where focus goes back to; defaults to whatever had focus when the dialog opened. */
    returnTo?: RefObject<HTMLElement | null>;
    onEscape: () => void;
  },
) {
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });
  useEffect(() => {
    if (!open) return;
    const token = {};
    stack.push(token);
    const opener =
      latest.current.returnTo?.current ??
      (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const panel = panelRef.current;
    (latest.current.initial?.current ?? panel)?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (stack[stack.length - 1] !== token || !panelRef.current) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        latest.current.onEscape();
        return;
      }
      if (event.key !== "Tab") return;
      const current = panelRef.current;
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const target = trappedTabTarget(
        tabbableIn(current),
        active,
        active !== null && current.contains(active),
        event.shiftKey,
      );
      if (target) {
        event.preventDefault();
        target.focus();
      }
    };
    const onFocusIn = (event: FocusEvent) => {
      const current = panelRef.current;
      if (stack[stack.length - 1] !== token || !current) return;
      if (event.target instanceof Node && !current.contains(event.target)) {
        (tabbableIn(current)[0] ?? current).focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", onFocusIn);
      const at = stack.indexOf(token);
      if (at !== -1) stack.splice(at, 1);
      const active = document.activeElement;
      if (!active || active === document.body || panel?.contains(active)) opener?.focus();
    };
  }, [open, panelRef]);
}
