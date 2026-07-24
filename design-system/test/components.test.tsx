import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Badge, Button, Modal, Select, ToastProvider, useToast } from "../src/index.js";

describe("DS: Button", () => {
  it("renderuje i woła onClick", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Zapisz</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Zapisz" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("domyślnie type=button (nie submituje formularza mimowolnie)", () => {
    render(<Button>X</Button>);
    expect(screen.getByRole("button")).toHaveProperty("type", "button");
  });
});

describe("DS: Select", () => {
  it("renderuje opcje + placeholder jako pustą wartość", () => {
    render(
      <Select
        placeholder="Wszystkie"
        options={[
          { value: "active", label: "Aktywny" },
          { value: "archived", label: "Zarchiwizowany" },
        ]}
      />,
    );
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveProperty("value", "");
  });
});

describe("DS: Badge", () => {
  it("renderuje treść statusu", () => {
    render(<Badge tone="success">Aktywny</Badge>);
    expect(screen.getByText("Aktywny")).toBeTruthy();
  });
});

describe("DS: Modal", () => {
  it("pokazuje się gdy open i zamyka na Escape", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Potwierdź">
        Treść
      </Modal>,
    );
    expect(screen.getByRole("dialog", { name: "Potwierdź" })).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("nie renderuje nic gdy open=false", () => {
    render(
      <Modal open={false} onClose={() => {}} title="Ukryty">
        Treść
      </Modal>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("DS: Toast", () => {
  it("useToast dodaje powiadomienie widoczne w regionie", () => {
    function Trigger() {
      const { toast } = useToast();
      return <button onClick={() => toast("Zapisano", "success")}>emit</button>;
    }
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("emit"));
    expect(screen.getByRole("status").textContent).toContain("Zapisano");
  });

  it("useToast rzuca poza ToastProvider", () => {
    function Bad() {
      useToast();
      return null;
    }
    expect(() => render(<Bad />)).toThrow(/ToastProvider/);
  });

  it("Modal utrzymuje stan open sterowany z zewnątrz", () => {
    function Host() {
      const [open, setOpen] = useState(true);
      return (
        <Modal open={open} onClose={() => setOpen(false)} title="Ctl">
          x
        </Modal>
      );
    }
    render(<Host />);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
