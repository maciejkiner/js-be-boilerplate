import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Wizard, type WizardStepConfig } from "../src/index.js";

function makeSteps(): WizardStepConfig<Record<string, unknown>>[] {
  return [
    {
      id: "a",
      label: "Krok A",
      schema: z.object({ name: z.string().min(1) }),
      render: (wizard) => (
        <input
          aria-label="name"
          value={(wizard.values.name as string) ?? ""}
          onChange={(event) => wizard.setValue("name", event.target.value)}
        />
      ),
    },
    {
      id: "b",
      label: "Krok B",
      schema: z.object({}),
      render: () => <div>Ostatni krok</div>,
    },
  ];
}

describe("Wizard (the reusable structure)", () => {
  it("renderuje Stepper i pierwszy krok", () => {
    render(<Wizard steps={makeSteps()} defaultValues={{ name: "" }} onComplete={vi.fn()} />);
    expect(screen.getByText("Krok A")).toBeTruthy();
    expect(screen.getByText("Krok B")).toBeTruthy();
    expect(screen.getByLabelText("name")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Dalej" })).toBeTruthy();
  });

  it("next is gated by the step validation; when valid it advances", () => {
    render(<Wizard steps={makeSteps()} defaultValues={{ name: "" }} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Dalej" }));
    expect(screen.queryByText("Ostatni krok")).toBeNull(); // an empty `name` → it does not advance

    fireEvent.change(screen.getByLabelText("name"), { target: { value: "Ala" } });
    fireEvent.click(screen.getByRole("button", { name: "Dalej" }));
    expect(screen.getByText("Ostatni krok")).toBeTruthy();
  });

  it("submit on the last step calls onComplete with the collected values; prev goes back", () => {
    const onComplete = vi.fn();
    render(<Wizard steps={makeSteps()} defaultValues={{ name: "" }} onComplete={onComplete} />);
    fireEvent.change(screen.getByLabelText("name"), { target: { value: "Ala" } });
    fireEvent.click(screen.getByRole("button", { name: "Dalej" }));

    fireEvent.click(screen.getByRole("button", { name: "Wstecz" }));
    expect(screen.getByLabelText("name")).toBeTruthy(); // we are back on step A

    fireEvent.click(screen.getByRole("button", { name: "Dalej" }));
    fireEvent.click(screen.getByRole("button", { name: "Zakończ" }));
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ name: "Ala" }));
  });
});
