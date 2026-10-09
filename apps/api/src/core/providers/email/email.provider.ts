export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Template key for logs/analytics, e.g. "portal_otp". */
  tag: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<{ messageId: string }>;
}

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');
