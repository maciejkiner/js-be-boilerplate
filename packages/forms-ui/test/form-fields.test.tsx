import type { FormApi } from "@repo/forms";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { type FieldDef, FormFields } from "../src/index.js";

/** Render z QueryClientProvider — pola relacji używają `useQuery` (async fetch opcji). */
function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function makeForm(values: Record<string, unknown>, errors: Record<string, string> = {}) {
  const setValue = vi.fn();
  const form = {
    values,
    errors,
    touched: {},
    isSubmitting: false,
    setValue,
    setFieldTouched: vi.fn(),
    validate: () => true,
    handleSubmit: async () => {},
    reset: () => {},
  } as unknown as FormApi<Record<string, unknown>>;
  return { form, setValue };
}

const fields: FieldDef[] = [
  { name: "name", label: "Nazwa", control: "text", required: true },
  {
    name: "status",
    label: "Status",
    control: "select",
    options: [{ value: "active", label: "Aktywny" }],
  },
  { name: "isBlocked", label: "Zablokowane", control: "switch" },
  {
    name: "projectId",
    label: "Projekt",
    control: "relation",
    relation: { entity: "project", displayField: "name" },
  },
];

describe("FormFields (mapowanie typ→komponent)", () => {
  it("renderuje kontrolki z mapowania; zmiana → form.setValue(name, value)", () => {
    const { form, setValue } = makeForm({ name: "", status: "", isBlocked: false, projectId: "" });
    renderWithClient(<FormFields fields={fields} form={form} relationSource={async () => []} />);

    fireEvent.change(screen.getByLabelText(/Nazwa/), { target: { value: "Beta" } });
    expect(setValue).toHaveBeenCalledWith("name", "Beta");

    fireEvent.click(screen.getByRole("switch"));
    expect(setValue).toHaveBeenCalledWith("isBlocked", true);

    // relation → DS Combobox (identyfikowany po placeholderze)
    expect(screen.getByText("Wybierz…")).toBeTruthy();
  });

  it("relacja: opcje z async fetchera, label z displayField", async () => {
    const { form } = makeForm({ projectId: "" });
    renderWithClient(
      <FormFields
        fields={[fields[3]!]}
        form={form}
        relationSource={async () => [{ id: "p1", name: "Alpha" }]}
      />,
    );
    fireEvent.click(screen.getByRole("combobox"));
    // label pochodzi z pola `name` (displayField relacji), nie z hardkodu
    expect(await screen.findByText("Alpha")).toBeTruthy();
  });

  it("wymagane pole ma znacznik, a błąd renderuje się jako alert", () => {
    const { form } = makeForm({ name: "" }, { name: "wymagane" });
    renderWithClient(<FormFields fields={[fields[0]!]} form={form} />);
    expect(screen.getByText(/\*/)).toBeTruthy(); // required marker
    expect(screen.getByRole("alert").textContent).toContain("wymagane");
  });

  it("renderuje podpowiedź z pola help pod kontrolką", () => {
    const { form } = makeForm({ name: "" });
    renderWithClient(
      <FormFields
        fields={[{ name: "name", label: "Nazwa", control: "text", help: "Widoczna publicznie" }]}
        form={form}
      />,
    );
    expect(screen.getByText("Widoczna publicznie")).toBeTruthy();
  });

  it("warunkowa widoczność: pole z visibleWhen renderuje się tylko gdy warunek spełniony", () => {
    const conditional: FieldDef[] = [
      { name: "kind", label: "Rodzaj", control: "text" },
      { name: "extra", label: "Dodatkowe", control: "text", visibleWhen: (v) => v.kind === "b" },
    ];
    const hidden = makeForm({ kind: "a", extra: "" });
    const { rerender } = renderWithClient(<FormFields fields={conditional} form={hidden.form} />);
    expect(screen.queryByLabelText("Dodatkowe")).toBeNull();

    const shown = makeForm({ kind: "b", extra: "" });
    rerender(<FormFields fields={conditional} form={shown.form} />);
    expect(screen.getByLabelText("Dodatkowe")).toBeTruthy();
  });
});
