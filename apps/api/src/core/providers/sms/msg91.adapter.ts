import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config';
import { callWithPolicy } from '../call-policy';
import { readJsonOrThrow } from '../http-error';
import { type SmsMessage, type SmsProvider, SmsRejectedError } from './sms.provider';

interface FlowResponse {
  type?: string;
  message?: string;
}

/** MSG91 Flow API v5: sends a DLT-approved template with variables. */
@Injectable()
export class Msg91SmsAdapter implements SmsProvider {
  private readonly authKey: string;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    if (!config.messaging.msg91AuthKey) throw new Error('MSG91_AUTH_KEY is not configured');
    this.authKey = config.messaging.msg91AuthKey;
  }

  async send(message: SmsMessage): Promise<{ messageId: string }> {
    if (!message.templateId)
      throw new SmsRejectedError(`template ${message.tag} has no DLT template id`);
    const mobiles = message.to.replace(/^\+/, '');
    // Flow sends are not idempotent at the gateway, so only connection-level failures retry.
    const body = await callWithPolicy(
      'msg91',
      async () =>
        readJsonOrThrow<FlowResponse>(
          'msg91',
          await fetch('https://control.msg91.com/api/v5/flow', {
            method: 'POST',
            headers: {
              authkey: this.authKey,
              'content-type': 'application/json',
              accept: 'application/json',
            },
            body: JSON.stringify({
              template_id: message.templateId,
              short_url: '0',
              recipients: [{ mobiles, ...message.variables }],
            }),
          }),
        ),
      { retries: 1, timeoutMs: 8_000 },
    );
    if (body.type !== 'success')
      throw new SmsRejectedError(body.message ?? 'MSG91 rejected the message');
    return { messageId: body.message ?? '' };
  }
}
