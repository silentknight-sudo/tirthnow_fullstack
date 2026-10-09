import { Inject, Injectable } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { APP_CONFIG, type AppConfig } from '../../config';
import { callWithPolicy } from '../call-policy';
import { type EmailMessage, type EmailProvider } from './email.provider';

/** SMTP adapter: Mailpit locally, SES/Postmark SMTP in production. */
@Injectable()
export class SmtpEmailAdapter implements EmailProvider {
  private readonly transport: Transporter<SMTPTransport.SentMessageInfo>;
  private readonly from: string;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    const { host, port, user, pass, from } = config.email;
    this.from = from;
    this.transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      ...(user && pass ? { auth: { user, pass } } : {}),
    });
  }

  async send(message: EmailMessage): Promise<{ messageId: string }> {
    // No retries: SMTP sends are not idempotent.
    const info = await callWithPolicy(
      'smtp',
      () =>
        this.transport.sendMail({
          from: this.from,
          to: message.to,
          subject: message.subject,
          text: message.text,
          ...(message.html ? { html: message.html } : {}),
          headers: { 'X-Tag': message.tag },
        }),
      { retries: 0 },
    );
    return { messageId: info.messageId };
  }
}
