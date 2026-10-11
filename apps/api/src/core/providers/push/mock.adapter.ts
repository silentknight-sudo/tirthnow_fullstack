import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { type PushMessage, type PushProvider, type PushResult } from './push.provider';

export interface SentPush extends PushMessage {
  token: string;
  messageId: string;
  sentAt: string;
}

/** In-memory push outbox (dev outbox, tests). Tokens starting with "invalid" are rejected as dead. */
@Injectable()
export class MockPushAdapter implements PushProvider {
  private static readonly MAX = 500;
  readonly outbox: SentPush[] = [];

  send(tokens: string[], message: PushMessage): Promise<PushResult[]> {
    return Promise.resolve(
      tokens.map((token) => {
        if (token.startsWith('invalid')) {
          return {
            token,
            ok: false,
            invalidToken: true,
            messageId: null,
            error: 'registration-token-not-registered',
          };
        }
        const messageId = `push-mock-${randomUUID()}`;
        this.outbox.push({ ...message, token, messageId, sentAt: new Date().toISOString() });
        if (this.outbox.length > MockPushAdapter.MAX) this.outbox.shift();
        return { token, ok: true, invalidToken: false, messageId, error: null };
      }),
    );
  }

  to(token: string): SentPush[] {
    return this.outbox.filter((m) => m.token === token);
  }
}
