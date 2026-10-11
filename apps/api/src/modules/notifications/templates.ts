import { type NotifChannel } from '@prisma/client';
import { type Lang } from '@tirth-now/shared-types';

export type TemplateCategory = 'orders' | 'aarti' | 'safety' | 'vendor' | 'marketing' | 'system';

export interface BuiltInTemplate {
  channels: NotifChannel[];
  category: TemplateCategory;
  title: Record<Lang, string>;
  body: Record<Lang, string>;
  /** Variable order for WhatsApp template parameters ({{1}}, {{2}}, …). */
  variables: string[];
  /** Name of the approved WhatsApp template (same key by default). */
  whatsappTemplate?: string;
  /** Android notification channel configured in the app. */
  androidChannel: 'orders' | 'aarti' | 'sos' | 'general';
  priority: 'normal' | 'high';
}

/**
 * Built-in templates. Rows in `notification_templates` (same key + channel) override text and
 * carry gateway ids (DLT template id, WhatsApp template name) once registered.
 */
export const TEMPLATES = {
  order_confirmed: {
    channels: ['push', 'in_app'],
    category: 'orders',
    title: { en: 'Booking confirmed', hi: 'बुकिंग की पुष्टि हुई' },
    body: {
      en: '{{summary}} is confirmed. Booking ID {{code}}.',
      hi: '{{summary}} की पुष्टि हो गई है। बुकिंग आईडी {{code}}।',
    },
    variables: ['summary', 'code'],
    androidChannel: 'orders',
    priority: 'high',
  },
  order_accepted: {
    channels: ['push', 'in_app'],
    category: 'orders',
    title: { en: 'Your booking is accepted', hi: 'आपकी बुकिंग स्वीकार हुई' },
    body: {
      en: '{{summary}} ({{code}}) was accepted by the provider. {{extra}}',
      hi: '{{summary}} ({{code}}) प्रदाता ने स्वीकार की। {{extra}}',
    },
    variables: ['summary', 'code', 'extra'],
    androidChannel: 'orders',
    priority: 'high',
  },
  order_started: {
    channels: ['push', 'in_app'],
    category: 'orders',
    title: { en: 'Your booking has started', hi: 'आपकी बुकिंग शुरू हो गई है' },
    body: {
      en: '{{summary}} ({{code}}) is now in progress.',
      hi: '{{summary}} ({{code}}) अब जारी है।',
    },
    variables: ['summary', 'code'],
    androidChannel: 'orders',
    priority: 'normal',
  },
  order_completed: {
    channels: ['push', 'in_app'],
    category: 'orders',
    title: { en: 'Hope it went well', hi: 'आशा है अनुभव अच्छा रहा' },
    body: {
      en: '{{summary}} ({{code}}) is complete. Tap to leave a review.',
      hi: '{{summary}} ({{code}}) पूरी हुई। समीक्षा लिखने के लिए टैप करें।',
    },
    variables: ['summary', 'code'],
    androidChannel: 'orders',
    priority: 'normal',
  },
  order_cancelled: {
    channels: ['push', 'in_app'],
    category: 'orders',
    title: { en: 'Booking cancelled', hi: 'बुकिंग रद्द' },
    body: {
      en: '{{summary}} ({{code}}) was cancelled. {{extra}}',
      hi: '{{summary}} ({{code}}) रद्द कर दी गई। {{extra}}',
    },
    variables: ['summary', 'code', 'extra'],
    androidChannel: 'orders',
    priority: 'high',
  },
  refund_processed: {
    channels: ['push', 'in_app'],
    category: 'orders',
    title: { en: 'Refund processed', hi: 'रिफ़ंड हो गया' },
    body: {
      en: '{{amount}} for booking {{code}} is on its way to your account (5–7 working days).',
      hi: 'बुकिंग {{code}} के {{amount}} आपके खाते में भेजे गए (5–7 कार्यदिवस)।',
    },
    variables: ['amount', 'code'],
    androidChannel: 'orders',
    priority: 'normal',
  },
  vendor_new_order: {
    channels: ['push', 'in_app'],
    category: 'vendor',
    title: { en: 'New booking', hi: 'नई बुकिंग' },
    body: {
      en: '{{summary}} — {{code}}. Please accept it in the portal.',
      hi: '{{summary}} — {{code}}। कृपया पोर्टल में स्वीकार करें।',
    },
    variables: ['summary', 'code'],
    androidChannel: 'orders',
    priority: 'high',
  },
  vendor_order_cancelled: {
    channels: ['push', 'in_app'],
    category: 'vendor',
    title: { en: 'Booking cancelled', hi: 'बुकिंग रद्द' },
    body: {
      en: '{{code}} ({{summary}}) was cancelled.',
      hi: '{{code}} ({{summary}}) रद्द कर दी गई।',
    },
    variables: ['code', 'summary'],
    androidChannel: 'orders',
    priority: 'normal',
  },
  review_reply: {
    channels: ['push', 'in_app'],
    category: 'orders',
    title: {
      en: '{{business}} replied to your review',
      hi: '{{business}} ने आपकी समीक्षा का जवाब दिया',
    },
    body: { en: '"{{reply}}"', hi: '"{{reply}}"' },
    variables: ['business', 'reply'],
    androidChannel: 'general',
    priority: 'normal',
  },
  content_warning: {
    channels: ['push', 'in_app'],
    category: 'system',
    title: { en: 'Community guidelines', hi: 'सामुदायिक दिशानिर्देश' },
    body: {
      en: 'Some of your content broke our community guidelines and was {{outcome}}. Repeated issues can lead to suspension.',
      hi: 'आपकी कुछ सामग्री ने सामुदायिक दिशानिर्देशों का उल्लंघन किया और उसे {{outcome}}। बार-बार ऐसा होने पर खाता निलंबित हो सकता है।',
    },
    variables: ['outcome'],
    androidChannel: 'general',
    priority: 'normal',
  },
  vendor_status: {
    channels: ['push', 'in_app'],
    category: 'vendor',
    title: { en: 'Account update', hi: 'खाते की जानकारी' },
    body: { en: '{{business}}: {{status}}. {{note}}', hi: '{{business}}: {{status}}। {{note}}' },
    variables: ['business', 'status', 'note'],
    androidChannel: 'general',
    priority: 'normal',
  },
  payout_paid: {
    channels: ['push', 'in_app'],
    category: 'vendor',
    title: { en: 'Payout sent', hi: 'भुगतान भेजा गया' },
    body: {
      en: '{{amount}} has been transferred to your bank account.',
      hi: '{{amount}} आपके बैंक खाते में भेज दिए गए हैं।',
    },
    variables: ['amount'],
    androidChannel: 'general',
    priority: 'normal',
  },
  payout_failed: {
    channels: ['push', 'in_app'],
    category: 'vendor',
    title: { en: 'Payout failed', hi: 'भुगतान विफल' },
    body: {
      en: 'We could not transfer {{amount}}. Please check your bank details.',
      hi: '{{amount}} ट्रांसफ़र नहीं हो सका। कृपया बैंक विवरण जाँचें।',
    },
    variables: ['amount'],
    androidChannel: 'general',
    priority: 'high',
  },
  aarti_reminder: {
    channels: ['push', 'in_app'],
    category: 'aarti',
    title: { en: '{{aarti}} in {{minutes}} min', hi: '{{aarti}} {{minutes}} मिनट में' },
    body: {
      en: '{{aarti}} at {{temple}} starts at {{time}}.',
      hi: '{{temple}} में {{aarti}} {{time}} बजे शुरू होगी।',
    },
    variables: ['aarti', 'temple', 'time', 'minutes'],
    androidChannel: 'aarti',
    priority: 'high',
  },
  sos_alert: {
    channels: ['sms', 'whatsapp', 'push'],
    category: 'safety',
    title: { en: 'SOS: {{name}} needs help', hi: 'SOS: {{name}} को मदद चाहिए' },
    body: {
      en: '{{name}} triggered an SOS on Tirth Now. Live location: {{link}} Nearest police: {{police}}',
      hi: '{{name}} ने Tirth Now पर SOS भेजा है। लाइव लोकेशन: {{link}} निकटतम पुलिस: {{police}}',
    },
    variables: ['name', 'link', 'police'],
    androidChannel: 'sos',
    priority: 'high',
  },
  sos_resolved: {
    channels: ['sms', 'push'],
    category: 'safety',
    title: { en: '{{name}} is safe', hi: '{{name}} सुरक्षित हैं' },
    body: {
      en: '{{name}} marked their SOS as resolved on Tirth Now.',
      hi: '{{name}} ने Tirth Now पर अपना SOS समाप्त किया।',
    },
    variables: ['name'],
    androidChannel: 'sos',
    priority: 'high',
  },
  broadcast: {
    channels: ['push', 'in_app'],
    category: 'marketing',
    title: { en: '{{title}}', hi: '{{title}}' },
    body: { en: '{{body}}', hi: '{{body}}' },
    variables: ['title', 'body'],
    androidChannel: 'general',
    priority: 'normal',
  },
  emergency_broadcast: {
    channels: ['push', 'in_app'],
    category: 'safety',
    title: { en: '{{title}}', hi: '{{title}}' },
    body: { en: '{{body}}', hi: '{{body}}' },
    variables: ['title', 'body'],
    androidChannel: 'sos',
    priority: 'high',
  },
} satisfies Record<string, BuiltInTemplate>;

export type TemplateKey = keyof typeof TEMPLATES;
export const TEMPLATE_KEYS = Object.keys(TEMPLATES) as TemplateKey[];

export type Vars = Record<string, string>;

/** `{{name}}` substitution; unknown variables render empty and doubled spaces collapse. */
export function render(text: string, vars: Vars): string {
  return text
    .replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? '')
    .replace(/ {2,}/g, ' ')
    .trim();
}

/** ₹1,234.50 (Indian grouping); whole rupees drop the paise. */
export function formatInr(paise: number): string {
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString('en-IN', { minimumFractionDigits: paise % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
}
