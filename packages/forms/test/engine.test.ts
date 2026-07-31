import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  FORM_ERROR_KEY,
  serverErrorToFieldErrors,
  useForm,
  useWizard,
  WizardStepError,
  zodErrorsToFieldErrors,
} from "../src/index.js";

const projectSchema = z
  .object({
    name: z.string().min(1, "wymagane"),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((v) => v.endDate >= v.startDate, { message: "koniec≥start", path: ["endDate"] });

describe("zodErrorsToFieldErrors", () => {
  it("mapuje błędy per pole (pierwszy) i międzypolowe po path", () => {
    const result = projectSchema.safeParse({
      name: "",
      startDate: "2026-02-01",
      endDate: "2026-01-01",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const errors = zodErrorsToFieldErrors(result.error);
    expect(errors.name).toBe("wymagane");
    expect(errors.endDate).toBe("koniec≥start"); // refine z path: ["endDate"]
  });
});

describe("useForm", () => {
  const defaults = { name: "", startDate: "2026-01-01", endDate: "2026-02-01" };

  it("blokuje submit i ustawia błędy gdy niepoprawne", async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useForm({ schema: projectSchema, defaultValues: defaults, onSubmit }),
    );
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.errors.name).toBe("wymagane");
  });

  it("submit z poprawnymi danymi woła onSubmit ze sparsowanymi wartościami", async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useForm({ schema: projectSchema, defaultValues: defaults, onSubmit }),
    );
    act(() => result.current.setValue("name", "Alpha"));
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(onSubmit).toHaveBeenCalledOnce();
    const arg = onSubmit.mock.calls[0]![0] as { name: string; startDate: Date };
    expect(arg.name).toBe("Alpha");
    expect(arg.startDate).toBeInstanceOf(Date); // Zod coerce
  });

  it("walidacja międzypolowa: endDate < startDate → błąd na endDate", async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useForm({ schema: projectSchema, defaultValues: defaults, onSubmit }),
    );
    act(() => {
      result.current.setValue("name", "Alpha");
      result.current.setValue("endDate", "2025-01-01");
    });
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.errors.endDate).toBe("koniec≥start");
  });
});

describe("useWizard", () => {
  const steps = [
    { id: "s1", label: "Dane", schema: z.object({ name: z.string().min(1, "wym") }) },
    { id: "s2", label: "Kontakt", schema: z.object({ email: z.string().email("email") }) },
  ];

  it("next waliduje krok (blokuje) i przechodzi gdy OK; submit orkiestruje onComplete", async () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useWizard({ steps, defaultValues: { name: "", email: "" }, onComplete }),
    );

    act(() => result.current.next()); // krok 1 niepoprawny → zostaje
    expect(result.current.stepIndex).toBe(0);
    expect(result.current.errors.name).toBe("wym");

    act(() => result.current.setValue("name", "Alpha"));
    act(() => result.current.next()); // poprawny → dalej
    expect(result.current.stepIndex).toBe(1);
    expect(result.current.isLast).toBe(true);

    await act(async () => {
      await result.current.submit(); // email niepoprawny → brak onComplete
    });
    expect(onComplete).not.toHaveBeenCalled();

    act(() => result.current.setValue("email", "a@b.com"));
    await act(async () => {
      await result.current.submit();
    });
    expect(onComplete).toHaveBeenCalledWith({ name: "Alpha", email: "a@b.com" });
  });
});

/** Odpowiedź problem+json z rozszerzeniem `errors` — kształt, który rzuca `ApiError`. */
function apiError(detail: string, errors?: { path: string; message: string }[]) {
  return Object.assign(new Error(detail), { status: 409, detail, errors });
}

describe("serverErrorToFieldErrors", () => {
  it("mapuje rozszerzenie `errors` na pola; pusta ścieżka → błąd globalny", () => {
    const error = apiError("Event: wartości (slug) muszą być unikalne.", [
      { path: "slug", message: "Ta wartość jest już zajęta." },
      { path: "", message: "Dane są sprzeczne." },
    ]);
    expect(serverErrorToFieldErrors(error)).toEqual({
      slug: "Ta wartość jest już zajęta.",
      [FORM_ERROR_KEY]: "Dane są sprzeczne.",
    });
  });

  it("sięga po błędy pól do `cause` (błąd opakowany np. przez WizardStepError)", () => {
    const wrapped = new WizardStepError("event", "boom", {
      cause: apiError("konflikt", [{ path: "slug", message: "zajęte" }]),
    });
    expect(serverErrorToFieldErrors(wrapped)).toEqual({ slug: "zajęte" });
  });

  it("ignoruje kształty, które nie są listą błędów pól", () => {
    expect(serverErrorToFieldErrors(new Error("sieć padła"))).toEqual({});
    expect(serverErrorToFieldErrors(new AggregateError([new Error("a")], "b"))).toEqual({});
    expect(serverErrorToFieldErrors(undefined)).toEqual({});
  });
});

describe("useForm — błąd z onSubmit", () => {
  const defaults = { name: "Alpha", startDate: "2026-01-01", endDate: "2026-02-01" };

  it("mapuje błąd API na pole i komunikat globalny zamiast go połykać", async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(
        apiError("Event: wartości (slug) muszą być unikalne.", [
          { path: "name", message: "Ta wartość jest już zajęta." },
        ]),
      );
    const { result } = renderHook(() =>
      useForm({ schema: projectSchema, defaultValues: defaults, onSubmit }),
    );

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.errors.name).toBe("Ta wartość jest już zajęta.");
    expect(result.current.errors[FORM_ERROR_KEY]).toBe(
      "Event: wartości (slug) muszą być unikalne.",
    );
    expect(result.current.isSubmitting).toBe(false);
  });

  it("błąd bez wskazania pól ląduje w komunikacie globalnym", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Sieć padła."));
    const { result } = renderHook(() =>
      useForm({ schema: projectSchema, defaultValues: defaults, onSubmit }),
    );

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(result.current.errors).toEqual({ [FORM_ERROR_KEY]: "Sieć padła." });
  });
});

describe("useWizard — błąd finalnej orkiestracji", () => {
  const steps = [
    { id: "s1", label: "Dane", schema: z.object({ name: z.string().min(1, "wym") }) },
    { id: "s2", label: "Kontakt", schema: z.object({ email: z.string().email("email") }) },
  ];
  const defaultValues = { name: "Alpha", email: "a@b.com" };

  it("cofa do kroku, pokazuje komunikat i zaznacza pole wskazane przez API", async () => {
    const onComplete = vi.fn().mockImplementation(() => {
      throw WizardStepError.from(
        "s1",
        apiError("Event: wartości (name) muszą być unikalne.", [
          { path: "name", message: "Ta wartość jest już zajęta." },
        ]),
      );
    });
    const { result } = renderHook(() => useWizard({ steps, defaultValues, onComplete }));

    act(() => result.current.next());
    expect(result.current.stepIndex).toBe(1);

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.stepIndex).toBe(0); // wróciliśmy do kroku, którego dotyczy błąd
    expect(result.current.submitError).toBe("Event: wartości (name) muszą być unikalne.");
    expect(result.current.errors.name).toBe("Ta wartość jest już zajęta.");
    expect(result.current.isSubmitting).toBe(false);
  });

  it("błąd bez wskazania pól: komunikat w chrome wizarda, pola czyste", async () => {
    const onComplete = vi.fn().mockRejectedValue(new Error("Mailer nie odpowiada."));
    const { result } = renderHook(() => useWizard({ steps, defaultValues, onComplete }));

    act(() => result.current.next());
    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.submitError).toBe("Mailer nie odpowiada.");
    expect(result.current.errors).toEqual({});
  });
});
