export interface PushMessage {
  title: string;
  body: string;
  /** String-only key/values delivered to the app (deep link, ids). */
  data?: Record<string, string>;
  /** High priority wakes the device (SOS, order updates). */
  priority?: 'normal' | 'high';
  /** Android channel id configured in the app (e.g. "sos", "orders", "aarti"). */
  channel?: string;
}

export interface PushResult {
  token: string;
  ok: boolean;
  /** The token is dead (app uninstalled or token rotated) and should be forgotten. */
  invalidToken: boolean;
  messageId: string | null;
  error: string | null;
}

/** Firebase Cloud Messaging today. */
export interface PushProvider {
  send(tokens: string[], message: PushMessage): Promise<PushResult[]>;
}

export const PUSH_PROVIDER = Symbol('PUSH_PROVIDER');
