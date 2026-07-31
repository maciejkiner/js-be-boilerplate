import { describe, expect, it } from "vitest";
import { intervalContains } from "../src/modules/talks/talks.rules.js";

const at = (iso: string) => new Date(iso);
const event = { startsAt: at("2026-09-10T09:00:00Z"), endsAt: at("2026-09-10T17:00:00Z") };

describe("intervalContains — prelekcja w oknie wydarzenia", () => {
  it("przyjmuje prelekcję w środku okna", () => {
    expect(
      intervalContains(event, {
        startsAt: at("2026-09-10T10:00:00Z"),
        endsAt: at("2026-09-10T11:00:00Z"),
      }),
    ).toBe(true);
  });

  it("przyjmuje prelekcję dokładnie na granicach okna", () => {
    expect(intervalContains(event, { startsAt: event.startsAt, endsAt: event.endsAt })).toBe(true);
  });

  it("odrzuca prelekcję zaczynającą się przed wydarzeniem", () => {
    expect(
      intervalContains(event, {
        startsAt: at("2026-09-10T08:59:00Z"),
        endsAt: at("2026-09-10T10:00:00Z"),
      }),
    ).toBe(false);
  });

  it("odrzuca prelekcję kończącą się po wydarzeniu", () => {
    expect(
      intervalContains(event, {
        startsAt: at("2026-09-10T16:00:00Z"),
        endsAt: at("2026-09-10T17:01:00Z"),
      }),
    ).toBe(false);
  });

  it("odrzuca prelekcję w zupełnie innym dniu", () => {
    expect(
      intervalContains(event, {
        startsAt: at("2026-09-11T10:00:00Z"),
        endsAt: at("2026-09-11T11:00:00Z"),
      }),
    ).toBe(false);
  });
});
