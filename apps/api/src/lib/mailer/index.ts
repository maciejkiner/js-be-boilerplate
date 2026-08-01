import type { Env } from "../../config/env.js";
import { SmtpMailer } from "./smtp.js";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * The mail-sending abstraction (implied by password reset). The vendor is replaceable: a project
 * can swap the adapter (SES, Postmark, …) without touching the auth logic.
 */
export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

/** The dev/production adapter: SMTP (mailhog locally, a real server in production). */
export function createMailer(env: Env): Mailer {
  return new SmtpMailer(env);
}
