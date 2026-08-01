import { z } from "zod";

/**
 * The environment variable contract. Validated once, at startup (fail-fast).
 * New variables go here — this is the only place that reads `process.env`.
 */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  DATABASE_URL: z.string().url(),
  SMTP_HOST: z.string().min(1).default("localhost"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_FROM: z.string().default("no-reply@example.com"),
  // Puste = brak raportowania (adapter no-op). Ustawione = adapter Sentry.
  SENTRY_DSN: z.string().default(""),
  // CORS: web + admin na osobnych originach (spec sekcja 3/7).
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  ADMIN_ORIGIN: z.string().url().default("http://localhost:5174"),
  // Auth. JWT_SECRET wymagany i mocny (min 32 znaki).
  JWT_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  // Auth cookies. COOKIE_DOMAIN, ".example.com" say, shares them between admin and api subdomains.
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  // The base of the password reset link (frontend); the token is appended as ?token=...
  PASSWORD_RESET_URL: z.string().url().default("http://localhost:5173/reset-password"),
});

export type Env = z.infer<typeof EnvSchema>;

export class EnvValidationError extends Error {
  constructor(public readonly issues: z.ZodIssue[]) {
    const summary = issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    super(`Invalid environment configuration:\n${summary}`);
    this.name = "EnvValidationError";
  }
}

/**
 * Parses and validates the environment. It throws `EnvValidationError` on the first problem —
 * called when the server starts, so the process never comes up with an invalid configuration.
 */
export function parseEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    throw new EnvValidationError(result.error.issues);
  }
  return result.data;
}
