import { Inject, Injectable } from '@nestjs/common';
import { type App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';
import { APP_CONFIG, type AppConfig } from '../../config';
import { callWithPolicy } from '../call-policy';
import { type PushMessage, type PushProvider, type PushResult } from './push.provider';

const APP_NAME = 'tirth-now-push';
const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);
const BATCH = 500;

/** FCM HTTP v1 via firebase-admin (service account from FIREBASE_* env). */
@Injectable()
export class FcmPushAdapter implements PushProvider {
  private readonly messaging: Messaging;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    const { projectId, clientEmail, privateKey } = config.firebase;
    if (!projectId || !clientEmail || !privateKey)
      throw new Error('Firebase credentials are not configured');
    const existing = getApps().find((a) => a.name === APP_NAME);
    const app: App =
      existing ??
      initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) }, APP_NAME);
    this.messaging = getMessaging(app);
  }

  async send(tokens: string[], message: PushMessage): Promise<PushResult[]> {
    const results: PushResult[] = [];
    for (let i = 0; i < tokens.length; i += BATCH) {
      const batch = tokens.slice(i, i + BATCH);
      const res = await callWithPolicy('fcm', () =>
        this.messaging.sendEachForMulticast({
          tokens: batch,
          notification: { title: message.title, body: message.body },
          data: message.data ?? {},
          android: {
            priority: message.priority === 'high' ? 'high' : 'normal',
            ...(message.channel ? { notification: { channelId: message.channel } } : {}),
          },
          apns: { headers: { 'apns-priority': message.priority === 'high' ? '10' : '5' } },
        }),
      );
      res.responses.forEach((r, idx) => {
        const token = batch[idx] ?? '';
        const code = r.error?.code ?? null;
        results.push({
          token,
          ok: r.success,
          invalidToken: code !== null && DEAD_TOKEN_CODES.has(code),
          messageId: r.messageId ?? null,
          error: r.error ? `${r.error.code}: ${r.error.message}` : null,
        });
      });
    }
    return results;
  }
}
