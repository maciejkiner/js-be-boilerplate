import { describe, expect, it } from "vitest";
import { EnvValidationError, parseEnv } from "../src/config/env.js";

const base = { DATABASE_URL: "postgres://app:app@localhost:5432/app" } as NodeJS.ProcessEnv;

describe("parseEnv", () => {
  it("wypełnia domyślne wartości i zwraca typowany config", () => {
    const env = parseEnv(base);
    expect(env.NODE_ENV).toBe("development");
    expect(env.PORT).toBe(3000);
    expect(env.LOG_LEVEL).toBe("info");
  });

  it("koeruje PORT ze stringa na liczbę", () => {
    const env = parseEnv({ ...base, PORT: "8080" } as NodeJS.ProcessEnv);
    expect(env.PORT).toBe(8080);
  });

  it("rzuca EnvValidationError gdy brakuje wymaganej DATABASE_URL", () => {
    expect(() => parseEnv({} as NodeJS.ProcessEnv)).toThrow(EnvValidationError);
  });

  it("rzuca gdy PORT nie jest liczbą", () => {
    expect(() => parseEnv({ ...base, PORT: "abc" } as NodeJS.ProcessEnv)).toThrow(
      EnvValidationError,
    );
  });
});
