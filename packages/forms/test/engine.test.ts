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
  it("maps per-field errors (the first one) and cross-field ones by path", () => {
    const result = projectSchema.safeParse({
      name: "",
      startDate: "2026-02-01",
      endDate: "2026-01-01",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const errors = zodErrorsToFieldErrors(result.error);
    expect(errors.name).toBe("wymagane");
    expect(errors.endDate).toBe("koniec≥start"); // refine with path: ["endDate"]
  });
});

describe("useForm", () => {
  const defaults = { name: "", startDate: "2026-01-01", endDate: "2026-02-01" };

  it("blocks the submit and sets the errors when invalid", async () => {
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

  it("a valid submit calls onSubmit with the parsed values", async () => {
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

  it("cross-field validation: endDate < startDate → an error on endDate", async () => {
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

  it("next validates the step (blocking) and advances when valid; submit orchestrates onComplete", async () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useWizard({ steps, defaultValues: { name: "", email: "" }, onComplete }),
    );

    act(() => result.current.next()); // step 1 invalid → stays put
    expect(result.current.stepIndex).toBe(0);
    expect(result.current.errors.name).toBe("wym");

    act(() => result.current.setValue("name", "Alpha"));
    act(() => result.current.next()); // valid → moves on
    expect(result.current.stepIndex).toBe(1);
    expect(result.current.isLast).toBe(true);

    await act(async () => {
      await result.current.submit(); // invalid e-mail → no onComplete
    });
    expect(onComplete).not.toHaveBeenCalled();

    act(() => result.current.setValue("email", "a@b.com"));
    await act(async () => {
      await result.current.submit();
    });
    expect(onComplete).toHaveBeenCalledWith({ name: "Alpha", email: "a@b.com" });
  });
});

/** A problem+json response with the `errors` extension — the shape `ApiError` throws. */
function apiError(detail: string, errors?: { path: string; message: string }[]) {
  return Object.assign(new Error(detail), { status: 409, detail, errors });
}

describe("serverErrorToFieldErrors", () => {
  it("maps the `errors` extension onto fields; an empty path → the global error", () => {
    const error = apiError("Event: wartości (slug) muszą być unikalne.", [
      { path: "slug", message: "Ta wartość jest już zajęta." },
      { path: "", message: "Dane są sprzeczne." },
    ]);
    expect(serverErrorToFieldErrors(error)).toEqual({
      slug: "Ta wartość jest już zajęta.",
      [FORM_ERROR_KEY]: "Dane są sprzeczne.",
    });
  });

  it("reaches into `cause` for field errors (an error wrapped by WizardStepError)", () => {
    const wrapped = new WizardStepError("event", "boom", {
      cause: apiError("konflikt", [{ path: "slug", message: "zajęte" }]),
    });
    expect(serverErrorToFieldErrors(wrapped)).toEqual({ slug: "zajęte" });
  });

  it("ignores shapes that are not a list of field errors", () => {
    expect(serverErrorToFieldErrors(new Error("sieć padła"))).toEqual({});
    expect(serverErrorToFieldErrors(new AggregateError([new Error("a")], "b"))).toEqual({});
    expect(serverErrorToFieldErrors(undefined)).toEqual({});
  });
});

describe("useForm — an error from onSubmit", () => {
  const defaults = { name: "Alpha", startDate: "2026-01-01", endDate: "2026-02-01" };

  it("maps an API error onto the field and the global message instead of swallowing it", async () => {
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

  it("an error naming no fields lands in the global message", async () => {
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

describe("useWizard — an error from the final orchestration", () => {
  const steps = [
    { id: "s1", label: "Dane", schema: z.object({ name: z.string().min(1, "wym") }) },
    { id: "s2", label: "Kontakt", schema: z.object({ email: z.string().email("email") }) },
  ];
  const defaultValues = { name: "Alpha", email: "a@b.com" };

  it("returns to the step, shows the message and marks the field the API named", async () => {
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

    expect(result.current.stepIndex).toBe(0); // we returned to the step the error belongs to
    expect(result.current.submitError).toBe("Event: wartości (name) muszą być unikalne.");
    expect(result.current.errors.name).toBe("Ta wartość jest już zajęta.");
    expect(result.current.isSubmitting).toBe(false);
  });

  it("an error naming no fields: the message in the wizard chrome, the fields clean", async () => {
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
