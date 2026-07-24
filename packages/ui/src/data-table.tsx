import { Button, Spinner, Table, Tbody, Td, Th, Thead, Tr } from "@repo/design-system";
import type { ReactNode } from "react";
import { EmptyState } from "./empty-state.js";

export type SortOrder = "asc" | "desc";
export interface SortState {
  column: string;
  order: SortOrder;
}

export interface Column<T> {
  /** Klucz kolumny (używany do sortowania i jako React key). */
  key: string;
  header: ReactNode;
  /** Render komórki; domyślnie surowa wartość `row[key]`. */
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  align?: "left" | "right";
}

export interface DataTablePagination {
  page: number;
  totalPages: number;
  total: number;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  isLoading?: boolean;
  error?: unknown;
  /** Aktualny sort; kliknięcie sortowalnego nagłówka woła `onSortChange` z przełączonym kierunkiem. */
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  pagination?: DataTablePagination;
  onPageChange?: (page: number) => void;
  onRowClick?: (row: T) => void;
  /** Slot na filtry kolumn (skorupa komponuje z DS Select/Input i steruje query). */
  toolbar?: ReactNode;
  /** Nadpisanie pustego stanu (domyślnie `EmptyState`). */
  empty?: ReactNode;
}

function nextOrder(sort: SortState | undefined, key: string): SortOrder {
  return sort?.column === key && sort.order === "asc" ? "desc" : "asc";
}

function sortIndicator(sort: SortState | undefined, key: string): string {
  if (sort?.column !== key) {
    return "";
  }
  return sort.order === "asc" ? " ▲" : " ▼";
}

/**
 * Tabela danych: sortowanie (nagłówki), paginacja (stopka), stany loading/error/empty.
 * Sterowana propsami — stan (sort/strona/filtry) i pobieranie danych żyją w skorupie
 * (DataTable nie zna routera ani źródła danych). Filtry idą przez slot `toolbar`.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  isLoading,
  error,
  sort,
  onSortChange,
  pagination,
  onPageChange,
  onRowClick,
  toolbar,
  empty,
}: DataTableProps<T>) {
  return (
    <div className="flex flex-col gap-3">
      {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}

      {error ? (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          Nie udało się wczytać danych.
        </div>
      ) : isLoading ? (
        <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
          <Spinner /> Ładowanie…
        </div>
      ) : rows.length === 0 ? (
        (empty ?? <EmptyState title="Brak danych" description="Nie ma jeszcze żadnych pozycji." />)
      ) : (
        <Table>
          <Thead>
            <Tr>
              {columns.map((column) => (
                <Th
                  key={column.key}
                  className={column.align === "right" ? "text-right" : undefined}
                >
                  {column.sortable && onSortChange ? (
                    <button
                      type="button"
                      className="inline-flex items-center font-semibold hover:text-slate-900"
                      onClick={() =>
                        onSortChange({ column: column.key, order: nextOrder(sort, column.key) })
                      }
                    >
                      {column.header}
                      {sortIndicator(sort, column.key)}
                    </button>
                  ) : (
                    column.header
                  )}
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((row) => (
              <Tr
                key={getRowId(row)}
                className={onRowClick ? "cursor-pointer" : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => (
                  <Td
                    key={column.key}
                    className={column.align === "right" ? "text-right" : undefined}
                  >
                    {column.render
                      ? column.render(row)
                      : String((row as Record<string, unknown>)[column.key] ?? "")}
                  </Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {pagination && onPageChange && rows.length > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Strona {pagination.page} z {pagination.totalPages} ({pagination.total} pozycji)
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              Poprzednia
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              Następna
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
