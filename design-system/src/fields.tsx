import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { cn } from "./cn.js";

const FIELD_BASE =
  "h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 " +
  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900 " +
  "disabled:cursor-not-allowed disabled:bg-slate-100";

/** Pole tekstowe DS (mock inventory: input). Pełne renderery formularzy powstają w Fazie 7. */
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD_BASE, className)} {...props} />;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  /** Opcja pusta na początku (np. „wszystkie") — wartość "". */
  placeholder?: string;
}

/** Wybór z listy DS (mock inventory: select). Używany m.in. do filtrów kolumn w DataTable. */
export function Select({ options, placeholder, className, ...props }: SelectProps) {
  return (
    <select className={cn(FIELD_BASE, "pr-8", className)} {...props}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
