import type { Mailer, MailMessage } from "./index.js";

/** The in-memory adapter: it collects mails instead of sending them. For tests and local debugging. */
export class MemoryMailer implements Mailer {
  readonly sent: MailMessage[] = [];

  async send(message: MailMessage): Promise<void> {
    this.sent.push(message);
  }
}
