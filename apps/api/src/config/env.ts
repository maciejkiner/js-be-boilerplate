import { z } from "zod";

/**
 * Kontrakt zmiennych środowiskowych. Walidowany raz, przy starcie (fail-fast).
 * Nowe zmienne dodajemy tutaj — to jedyne miejsce, które czyta `process.env`.
 */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  DATABASE_URL: z.string().url(),
  SMTP_HOST: z.string().min(1).default("localhost"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  // Puste = brak raportowania (adapter no-op). Ustawione = adapter Sentry.
  SENTRY_DSN: z.string().default(""),
  // CORS: web + admin na osobnych originach (spec sekcja 3/7). Używane od Fazy 3.
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  ADMIN_ORIGIN: z.string().url().default("http://localhost:5174"),
});

export type Env = z.infer<typeof EnvSchema>;

export class EnvValidationError extends Error {
  constructor(public readonly issues: z.ZodIssue[]) {
    const summary = issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    super(`Nieprawidłowa konfiguracja środowiska:\n${summary}`);
    this.name = "EnvValidationError";
  }
}

/**
 * Parsuje i waliduje env. Rzuca `EnvValidationError` przy pierwszym problemie —
 * wołane przy starcie serwera, żeby proces nie wstał z niepoprawną konfiguracją.
 */
export function parseEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    throw new EnvValidationError(result.error.issues);
  }
  return result.data;
}
