import { cn } from "./cn.js";

export interface Step {
  id: string;
  label: string;
}

/**
 * Stepper DS (mock inventory: tabs/stepper). Wskaźnik kroków wizarda — stan done/active/upcoming.
 * `current` = indeks aktywnego kroku (0-based). Prezentacyjny; nawigacją steruje silnik formularzy.
 */
export function Stepper({ steps, current }: { steps: Step[]; current: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Kroki">
      {steps.map((step, index) => {
        const state = index < current ? "done" : index === current ? "active" : "upcoming";
        return (
          <li key={step.id} className="flex items-center gap-2">
            <span
              aria-current={state === "active" ? "step" : undefined}
              className={cn(
                "inline-flex size-6 items-center justify-center rounded-full text-xs font-medium",
                state === "done" && "bg-slate-900 text-white",
                state === "active" && "border-2 border-slate-900 text-slate-900",
                state === "upcoming" && "border border-slate-300 text-slate-400",
              )}
            >
              {state === "done" ? "✓" : index + 1}
            </span>
            <span
              className={cn(
                "text-sm",
                state === "upcoming" ? "text-slate-400" : "text-slate-800",
                state === "active" && "font-medium",
              )}
            >
              {step.label}
            </span>
            {index < steps.length - 1 && (
              <span aria-hidden className="mx-1 h-px w-6 bg-slate-300" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
