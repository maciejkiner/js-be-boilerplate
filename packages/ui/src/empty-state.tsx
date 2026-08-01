import type { ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** The action (an "Add" button, say) — composed by the consumer. */
  action?: ReactNode;
}

/** Pusty stan listy/kolekcji — kompozycja na DS. */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 p-10 text-center">
      <p className="text-sm font-medium text-slate-900">{title}</p>
      {description && <p className="text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
