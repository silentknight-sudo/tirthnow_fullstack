export interface WhatsAppTemplateMessage {
  /** E.164. */
  to: string;
  /** Approved template name at Meta, e.g. "sos_alert". */
  templateName: string;
  /** Template language code, e.g. "en" or "hi". */
  lang: string;
  /** Body parameters in order ({{1}}, {{2}}, …). */
  params: string[];
  /** Rendered text, for logs and the mock outbox. */
  text: string;
}

/** WhatsApp Business Cloud API (Meta) today. */
export interface WhatsAppProvider {
  sendTemplate(message: WhatsAppTemplateMessage): Promise<{ messageId: string }>;
}

export const WHATSAPP_PROVIDER = Symbol('WHATSAPP_PROVIDER');
