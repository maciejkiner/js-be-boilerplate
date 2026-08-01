import { createTransport, type Transporter } from "nodemailer";
import type { Env } from "../../config/env.js";
import type { Mailer, MailMessage } from "./index.js";

/** The SMTP adapter (nodemailer). Dev: mailhog (no auth). Production: a real server from the env. */
export class SmtpMailer implements Mailer {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(env: Env) {
    this.from = env.SMTP_FROM;
    this.transporter = createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: false,
    });
  }

  async send(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({ from: this.from, ...message });
  }
}
