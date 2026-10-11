export interface SmsMessage {
  /** E.164, e.g. +919812345678. */
  to: string;
  /** Rendered text (logged by the mock; the real gateway renders from the template). */
  text: string;
  /** DLT-registered template id at the gateway (required in India for real sends). */
  templateId: string | null;
  /** Template variables, in the gateway's variable names. */
  variables: Record<string, string>;
  /** Template key for logs, e.g. "sos_alert". */
  tag: string;
}

/** MSG91 today (DLT-compliant flow templates). */
export interface SmsProvider {
  send(message: SmsMessage): Promise<{ messageId: string }>;
}

export const SMS_PROVIDER = Symbol('SMS_PROVIDER');

/** The gateway refused the message for a reason a retry will not fix. */
export class SmsRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SmsRejectedError';
  }
}
