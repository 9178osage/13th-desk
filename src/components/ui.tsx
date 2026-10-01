import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import { cn } from "@/lib/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "quiet" | "ghost";
};

const buttonStyles = {
  primary: "bg-moss text-card hover:bg-moss-deep shadow-sm",
  quiet: "border border-line bg-card text-ink hover:border-moss hover:shadow-sm",
  ghost: "text-moss hover:bg-moss-soft",
} as const;

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-[background-color,color,border-color,box-shadow] duration-160 disabled:cursor-not-allowed disabled:opacity-50",
        buttonStyles[variant],
        className,
      )}
      {...props}
    />
  );
}

type CardProps = {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
  tone?: "paper" | "moss" | "gold" | "plain";
};

const cardPad = { sm: "p-3", md: "p-4", lg: "p-5" } as const;
const cardTone = {
  paper: "border border-line bg-card shadow-paper",
  moss: "bg-moss text-card shadow-paper",
  gold: "border border-gold/20 bg-gold-soft text-ink",
  plain: "border border-line bg-card",
} as const;

export function Card({ children, className, padding = "md", tone = "paper" }: CardProps) {
  return (
    <div className={cn("rounded-lg", cardPad[padding], cardTone[tone], className)}>{children}</div>
  );
}

type ChipProps = {
  children: ReactNode;
  className?: string;
  active?: boolean;
  onClick?: () => void;
  pressed?: boolean;
};

export function Chip({ children, className, active, onClick, pressed }: ChipProps) {
  const classNames = cn(
    "inline-flex min-h-9 shrink-0 items-center rounded-full px-3 text-xs font-medium",
    onClick && "min-h-11 px-4 text-sm",
    active
      ? "bg-ink text-card"
      : onClick
        ? "border border-line bg-card text-ink hover:border-moss"
        : "border border-line bg-paper-deep/60 text-muted",
    className,
  );
  if (onClick) {
    return (
      <button type="button" aria-pressed={pressed ?? active} onClick={onClick} className={classNames}>
        {children}
      </button>
    );
  }
  return <span className={classNames}>{children}</span>;
}

type SectionHeaderProps = {
  title: string;
  kicker?: string;
  action?: ReactNode;
  className?: string;
};

export function SectionHeader({ title, kicker, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        {kicker ? (
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{kicker}</p>
        ) : null}
        <h2 className="font-display text-2xl text-ink md:text-3xl">{title}</h2>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

type EmptyStateProps = {
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, body, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-line bg-card/80 px-4 py-8 text-center shadow-paper",
        className,
      )}
    >
      <p className="font-display text-xl text-ink">{title}</p>
      {body ? <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{body}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "min-h-11 w-full rounded-md border border-line bg-card px-3 text-ink shadow-sm placeholder:text-muted focus:border-moss",
        className,
      )}
      {...props}
    />
  );
}

type StatProps = {
  value: string | number;
  label: string;
  className?: string;
  size?: "md" | "lg";
};

export function Stat({ value, label, className, size = "lg" }: StatProps) {
  return (
    <p
      className={cn(
        "font-display leading-none tabular-nums text-moss",
        size === "lg" ? "text-5xl" : "text-3xl",
        className,
      )}
    >
      {value}
      <span className="mt-1 block font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
        {label}
      </span>
    </p>
  );
}
