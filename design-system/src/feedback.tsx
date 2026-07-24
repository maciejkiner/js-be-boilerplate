import type { HTMLAttributes } from "react";
import { cn } from "./cn.js";

/** Spinner ładowania. `label` trafia do aria (dostępność stanu loading). */
export function Spinner({
  label = "Ładowanie…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span role="status" aria-label={label} className={cn("inline-flex items-center", className)}>
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
    </span>
  );
}

/** Skeleton — placeholder treści w trakcie ładowania. */
export function Skeleton({ className }: { className?: string }) {
  return <span className={cn("block animate-pulse rounded bg-slate-200", className)} aria-hidden />;
}

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  success: "bg-green-100 text-green-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
};

/** Etykieta statusu (np. status encji). */
export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
