import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { type SmsMessage, type SmsProvider, SmsRejectedError } from './sms.provider';

export interface SentSms extends SmsMessage {
  messageId: string;
  sentAt: string;
}

/** In-memory SMS outbox. Numbers listed in `rejectNumbers` fail permanently. */
@Injectable()
export class MockSmsAdapter implements SmsProvider {
  private static readonly MAX = 500;
  readonly outbox: SentSms[] = [];
  readonly rejectNumbers = new Set<string>();

  send(message: SmsMessage): Promise<{ messageId: string }> {
    if (this.rejectNumbers.has(message.to))
      return Promise.reject(new SmsRejectedError(`number ${message.to} rejected`));
    const messageId = `sms-mock-${randomUUID()}`;
    this.outbox.push({ ...message, messageId, sentAt: new Date().toISOString() });
    if (this.outbox.length > MockSmsAdapter.MAX) this.outbox.shift();
    return Promise.resolve({ messageId });
  }

  to(phone: string): SentSms[] {
    return this.outbox.filter((m) => m.to === phone);
  }
}
