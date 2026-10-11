import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { type WhatsAppProvider, type WhatsAppTemplateMessage } from './whatsapp.provider';

export interface SentWhatsApp extends WhatsAppTemplateMessage {
  messageId: string;
  sentAt: string;
}

@Injectable()
export class MockWhatsAppAdapter implements WhatsAppProvider {
  private static readonly MAX = 500;
  readonly outbox: SentWhatsApp[] = [];

  sendTemplate(message: WhatsAppTemplateMessage): Promise<{ messageId: string }> {
    const messageId = `wamid.mock-${randomUUID()}`;
    this.outbox.push({ ...message, messageId, sentAt: new Date().toISOString() });
    if (this.outbox.length > MockWhatsAppAdapter.MAX) this.outbox.shift();
    return Promise.resolve({ messageId });
  }

  to(phone: string): SentWhatsApp[] {
    return this.outbox.filter((m) => m.to === phone);
  }
}
