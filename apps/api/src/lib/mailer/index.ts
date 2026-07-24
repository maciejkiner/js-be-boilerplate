import type { Env } from "../../config/env.js";
import { SmtpMailer } from "./smtp.js";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Abstrakcja wysyłki maili (implikowana przez reset hasła). Vendor wymienny:
 * projekt może podmienić adapter (SES, Postmark…) bez ruszania logiki auth.
 */
export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

/** Adapter dev/prod: SMTP (mailhog lokalnie, realny serwer na produkcji). */
export function createMailer(env: Env): Mailer {
  return new SmtpMailer(env);
}
