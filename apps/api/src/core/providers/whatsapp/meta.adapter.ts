import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config';
import { callWithPolicy } from '../call-policy';
import { readJsonOrThrow } from '../http-error';
import { type WhatsAppProvider, type WhatsAppTemplateMessage } from './whatsapp.provider';

interface SendResponse {
  messages?: { id: string }[];
}

const GRAPH = 'https://graph.facebook.com/v21.0';

/** WhatsApp Business Cloud API: template messages only (business-initiated). */
@Injectable()
export class MetaWhatsAppAdapter implements WhatsAppProvider {
  private readonly phoneNumberId: string;
  private readonly token: string;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    const { whatsappPhoneNumberId, whatsappAccessToken } = config.messaging;
    if (!whatsappPhoneNumberId || !whatsappAccessToken)
      throw new Error('WhatsApp Cloud API is not configured');
    this.phoneNumberId = whatsappPhoneNumberId;
    this.token = whatsappAccessToken;
  }

  async sendTemplate(message: WhatsAppTemplateMessage): Promise<{ messageId: string }> {
    const body = await callWithPolicy(
      'whatsapp',
      async () =>
        readJsonOrThrow<SendResponse>(
          'whatsapp',
          await fetch(`${GRAPH}/${this.phoneNumberId}/messages`, {
            method: 'POST',
            headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: message.to.replace(/^\+/, ''),
              type: 'template',
              template: {
                name: message.templateName,
                language: { code: message.lang },
                components: message.params.length
                  ? [
                      {
                        type: 'body',
                        parameters: message.params.map((text) => ({ type: 'text', text })),
                      },
                    ]
                  : [],
              },
            }),
          }),
        ),
      { retries: 1, timeoutMs: 8_000 },
    );
    return { messageId: body.messages?.[0]?.id ?? '' };
  }
}
