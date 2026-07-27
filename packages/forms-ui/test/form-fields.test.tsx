import type { FormApi } from "@repo/forms";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { type FieldDef, FormFields } from "../src/index.js";

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
    render(
      <FormFields
        fields={fields}
        form={form}
        relationSource={() => ({ options: [{ value: "p1", label: "Alpha" }] })}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Nazwa/), { target: { value: "Beta" } });
    expect(setValue).toHaveBeenCalledWith("name", "Beta");

    fireEvent.click(screen.getByRole("switch"));
    expect(setValue).toHaveBeenCalledWith("isBlocked", true);

    // relation → DS Combobox (identyfikowany po placeholderze; natywny <select> też ma rolę combobox)
    expect(screen.getByText("Wybierz…")).toBeTruthy();
  });

  it("wymagane pole ma znacznik, a błąd renderuje się jako alert", () => {
    const { form } = makeForm({ name: "" }, { name: "wymagane" });
    render(<FormFields fields={[fields[0]!]} form={form} />);
    expect(screen.getByText(/\*/)).toBeTruthy(); // required marker
    expect(screen.getByRole("alert").textContent).toContain("wymagane");
  });
});
