import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Checkbox, Combobox, RadioGroup, Stepper, Switch, Textarea } from "../src/index.js";

const OPTIONS = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
];

describe("DS: Textarea", () => {
  it("renderuje i przyjmuje wartość", () => {
    render(<Textarea defaultValue="hej" aria-label="opis" />);
    expect((screen.getByLabelText("opis") as HTMLTextAreaElement).value).toBe("hej");
  });
});

describe("DS: Checkbox", () => {
  it("woła onChange z zaznaczeniem", () => {
    const onChange = vi.fn();
    render(<Checkbox aria-label="zgoda" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("zgoda"));
    expect(onChange).toHaveBeenCalledOnce();
  });
});

describe("DS: Switch", () => {
  it("role=switch, aria-checked, toggluje", () => {
    const onCheckedChange = vi.fn();
    render(<Switch checked={false} onCheckedChange={onCheckedChange} />);
    const sw = screen.getByRole("switch");
    expect(sw.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(sw);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});

describe("DS: RadioGroup", () => {
  it("wybiera wartość", () => {
    const onValueChange = vi.fn();
    render(<RadioGroup name="p" options={OPTIONS} value="a" onValueChange={onValueChange} />);
    fireEvent.click(screen.getByLabelText("Beta"));
    expect(onValueChange).toHaveBeenCalledWith("b");
  });
});

describe("DS: Combobox", () => {
  it("otwiera, filtruje lokalnie i wybiera opcję", () => {
    function Host() {
      const [value, setValue] = useState("");
      return <Combobox value={value} onValueChange={setValue} options={OPTIONS} />;
    }
    render(<Host />);
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.change(screen.getByPlaceholderText("Szukaj…"), { target: { value: "bet" } });
    expect(screen.queryByRole("option", { name: "Alpha" })).toBeNull();
    fireEvent.click(screen.getByRole("option", { name: "Beta" }));
    expect(screen.getByRole("combobox").textContent).toContain("Beta");
  });

  it("tryb async: woła onSearch i pokazuje loading", () => {
    const onSearch = vi.fn();
    render(<Combobox value="" onValueChange={() => {}} options={[]} onSearch={onSearch} loading />);
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.change(screen.getByPlaceholderText("Szukaj…"), { target: { value: "x" } });
    expect(onSearch).toHaveBeenCalledWith("x");
    expect(screen.getByText("Ładowanie…")).toBeTruthy();
  });
});

describe("DS: Stepper", () => {
  it("oznacza krok aktywny (aria-current)", () => {
    render(
      <Stepper
        current={1}
        steps={[
          { id: "1", label: "Dane" },
          { id: "2", label: "Zaproszenia" },
          { id: "3", label: "Zadania" },
        ]}
      />,
    );
    const active = screen.getByText("2");
    expect(active.getAttribute("aria-current")).toBe("step");
  });
});
