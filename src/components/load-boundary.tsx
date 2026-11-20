import { Component, type ErrorInfo, type ReactNode } from "react";
import { deskText as c, type DeskCopyKey } from "@/lib/desk-copy";
import type { Lang } from "@/lib/text";

type Props = {
  lang: Lang;
  /** Called when the visitor asks to try again (give the lazy component a fresh import). */
  onRetry: () => void;
  /** Called when the visitor dismisses the notice instead (e.g. close the palette). */
  onClose?: () => void;
  message?: DeskCopyKey;
  className?: string;
  children: ReactNode;
};

/**
 * Keeps an optional, lazily loaded part (command palette, GPA chart) from taking the
 * whole page down when its code cannot load or throws: only that part shows a short,
 * translated notice with "Try again". A chunk missing after a deploy still gets the
 * one-time reload offer from chunk-reload.ts; this is what is left if that was declined.
 */
export class LoadBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    // Keep the failure visible to developers; the visitor sees the notice instead.
    console.warn("Optional part failed to load", error, info.componentStack);
  }

  retry = () => {
    this.props.onRetry();
    this.setState({ failed: false });
  };

  render() {
    if (!this.state.failed) return this.props.children;
    const { lang, onClose, message = "partFailed", className } = this.props;
    return (
      <div role="alert" className={className ?? "load-failed"}>
        <span>{c(lang, message)}</span>
        <button type="button" onClick={this.retry}>
          {c(lang, "retry")}
        </button>
        {onClose ? (
          <button type="button" onClick={onClose}>
            {c(lang, "close")}
          </button>
        ) : null}
      </div>
    );
  }
}
