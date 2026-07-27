import { useMemo, useState } from "react";
import { cn } from "./cn.js";
import type { SelectOption } from "./fields.js";

export interface ComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  /**
   * Async: wywoływane przy zmianie zapytania — rodzic dostarcza `options` + `loading`
   * (pola relacji dociągane z API). Bez tego filtrowanie po stronie klienta.
   */
  onSearch?: (query: string) => void;
  loading?: boolean;
  emptyText?: string;
}

/**
 * Combobox DS (mock inventory: combobox async-search). Kontrolowany (single). Dla pól relacji
 * rodzic podaje `onSearch` + `options` + `loading`; bez `onSearch` filtruje lokalnie po etykiecie.
 */
export function Combobox({
  value,
  onValueChange,
  options,
  placeholder = "Wybierz…",
  disabled,
  onSearch,
  loading,
  emptyText = "Brak wyników",
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedLabel = options.find((option) => option.value === value)?.label ?? value;

  const visible = useMemo(() => {
    if (onSearch) {
      return options; // tryb async — filtrowanie po stronie API
    }
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query, onSearch]);

  return (
    <div className="relative">
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 text-left text-sm",
          "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-slate-900",
          "disabled:cursor-not-allowed disabled:bg-slate-100",
          value ? "text-slate-900" : "text-slate-400",
        )}
      >
        <span className="truncate">{value ? selectedLabel : placeholder}</span>
        <span aria-hidden className="ml-2 text-slate-400">
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
          <input
            autoFocus
            value={query}
            placeholder="Szukaj…"
            onChange={(event) => {
              setQuery(event.target.value);
              onSearch?.(event.target.value);
            }}
            className="w-full border-b border-slate-100 px-3 py-2 text-sm focus-visible:outline-none"
          />
          <ul role="listbox" className="max-h-56 overflow-auto py-1">
            {loading ? (
              <li className="px-3 py-2 text-sm text-slate-500">Ładowanie…</li>
            ) : visible.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-500">{emptyText}</li>
            ) : (
              visible.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={option.value === value}
                    onClick={() => {
                      onValueChange(option.value);
                      setQuery("");
                      setOpen(false);
                    }}
                    className={cn(
                      "block w-full px-3 py-2 text-left text-sm hover:bg-slate-50",
                      option.value === value && "bg-slate-100 font-medium",
                    )}
                  >
                    {option.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
