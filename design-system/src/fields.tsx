import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
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

/** Pole daty DS (mock inventory: date picker). Mock = natywny `<input type="date">`. */
export function DateInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="date" className={cn(FIELD_BASE, className)} {...props} />;
}

/** Tekst wieloliniowy DS (mock inventory: textarea). */
export function Textarea({
  className,
  rows = 4,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={rows}
      className={cn(FIELD_BASE.replace("h-9", "min-h-20 py-2"), className)}
      {...props}
    />
  );
}

/** Checkbox DS (mock inventory: checkbox). Kontrolowany przez `checked`/`onChange` (natywnie). */
export function Checkbox({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn(
        "size-4 rounded border-slate-300 text-slate-900",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900",
        "disabled:cursor-not-allowed",
        className,
      )}
      {...props}
    />
  );
}

/** Przełącznik DS (mock inventory: switch). Kontrolowany: `checked` + `onCheckedChange`. */
export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "inline-flex h-6 w-10 items-center rounded-full p-0.5 transition-colors",
        checked ? "bg-slate-900" : "bg-slate-300",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <span
        className={cn(
          "size-5 rounded-full bg-white transition-transform",
          checked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );
}

/** Grupa radio DS (mock inventory: radio). Kontrolowana: `value` + `onValueChange`. */
export function RadioGroup({
  options,
  value,
  onValueChange,
  name,
  disabled,
}: {
  options: SelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  name: string;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" className="flex flex-col gap-1.5">
      {options.map((option) => (
        <label key={option.value} className="inline-flex items-center gap-2 text-sm text-slate-800">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            disabled={disabled}
            onChange={() => onValueChange(option.value)}
            className="size-4 border-slate-300 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
