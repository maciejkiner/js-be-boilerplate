import type { Mailer, MailMessage } from "./index.js";

/** Adapter in-memory: zbiera maile zamiast wysyłać. Do testów i lokalnego debugowania. */
export class MemoryMailer implements Mailer {
  readonly sent: MailMessage[] = [];

  async send(message: MailMessage): Promise<void> {
    this.sent.push(message);
  }
}
