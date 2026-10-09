import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { type EmailMessage, type EmailProvider } from './email.provider';

export interface OutboxEntry extends EmailMessage {
  messageId: string;
  sentAt: string;
}

/** Keeps sent mail in memory (dev outbox, tests). Never leaves the process. */
@Injectable()
export class MockEmailAdapter implements EmailProvider {
  private static readonly MAX = 200;
  readonly outbox: OutboxEntry[] = [];

  send(message: EmailMessage): Promise<{ messageId: string }> {
    const messageId = `mock-${randomUUID()}`;
    this.outbox.push({ ...message, messageId, sentAt: new Date().toISOString() });
    if (this.outbox.length > MockEmailAdapter.MAX) this.outbox.shift();
    return Promise.resolve({ messageId });
  }

  lastTo(to: string): OutboxEntry | undefined {
    return [...this.outbox].reverse().find((m) => m.to === to);
  }
}
