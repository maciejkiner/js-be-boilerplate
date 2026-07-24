import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { type Column, DataTable, type DataTableProps } from "../src/index.js";

interface Row {
  id: string;
  name: string;
  status: string;
}

const rows: Row[] = [
  { id: "1", name: "Alpha", status: "active" },
  { id: "2", name: "Beta", status: "archived" },
];

const columns: Column<Row>[] = [
  { key: "name", header: "Nazwa", sortable: true },
  { key: "status", header: "Status" },
];

function setup(overrides: Partial<DataTableProps<Row>> = {}) {
  return render(<DataTable columns={columns} rows={rows} getRowId={(r) => r.id} {...overrides} />);
}

describe("DataTable", () => {
  it("renderuje wiersze", () => {
    setup();
    expect(screen.getByText("Alpha")).toBeTruthy();
    expect(screen.getByText("Beta")).toBeTruthy();
  });

  it("stan loading pokazuje spinner", () => {
    setup({ isLoading: true, rows: [] });
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("stan error pokazuje alert (i nie renderuje wierszy)", () => {
    setup({ error: new Error("x") });
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.queryByText("Alpha")).toBeNull();
  });

  it("pusta lista pokazuje empty state", () => {
    setup({ rows: [] });
    expect(screen.getByText("Brak danych")).toBeTruthy();
  });

  it("klik sortowalnego nagłówka woła onSortChange z przełączonym kierunkiem", () => {
    const onSortChange = vi.fn();
    setup({ sort: { column: "name", order: "asc" }, onSortChange });
    fireEvent.click(screen.getByRole("button", { name: /Nazwa/ }));
    expect(onSortChange).toHaveBeenCalledWith({ column: "name", order: "desc" });
  });

  it("paginacja: Poprzednia wyłączona na 1. stronie, Następna woła onPageChange", () => {
    const onPageChange = vi.fn();
    setup({
      pagination: { page: 1, totalPages: 3, total: 5 },
      onPageChange,
    });
    expect(screen.getByRole("button", { name: "Poprzednia" })).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("button", { name: "Następna" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
