import { type MediaKind } from '@prisma/client';
import { type AppConfig } from '../../../core/config';
import { type Bucket } from '../../../core/providers';

export const UPLOAD_PURPOSES = [
  'avatar',
  'listing_image',
  'menu_image',
  'review_image',
  'reel_video',
  'reel_thumbnail',
  'kyc_document',
  'knowledge_document',
  'landmark_photo',
  'voice_note',
] as const;
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

/** Purposes only staff (vendors/admins) may upload. */
export const STAFF_PURPOSES: ReadonlySet<UploadPurpose> = new Set([
  'listing_image',
  'menu_image',
  'kyc_document',
  'knowledge_document',
]);

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime'];
const DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const KNOWLEDGE_TYPES = ['application/pdf', 'text/plain', 'text/markdown'];
const AUDIO_TYPES = [
  'audio/mp4',
  'audio/aac',
  'audio/mpeg',
  'audio/ogg',
  'audio/webm',
  'audio/wav',
];

export interface PurposeRule {
  kind: MediaKind;
  bucket: Bucket;
  mimeTypes: string[];
  maxBytes: (config: AppConfig) => number;
}

const MB = 1024 * 1024;

export const PURPOSE_RULES: Record<UploadPurpose, PurposeRule> = {
  avatar: { kind: 'image', bucket: 'public', mimeTypes: IMAGE_TYPES, maxBytes: () => 5 * MB },
  listing_image: {
    kind: 'image',
    bucket: 'public',
    mimeTypes: IMAGE_TYPES,
    maxBytes: (c) => c.storage.maxImageBytes,
  },
  menu_image: {
    kind: 'image',
    bucket: 'public',
    mimeTypes: IMAGE_TYPES,
    maxBytes: (c) => c.storage.maxImageBytes,
  },
  review_image: {
    kind: 'image',
    bucket: 'public',
    mimeTypes: IMAGE_TYPES,
    maxBytes: (c) => c.storage.maxImageBytes,
  },
  reel_video: {
    kind: 'video',
    bucket: 'public',
    mimeTypes: VIDEO_TYPES,
    maxBytes: (c) => c.storage.maxVideoBytes,
  },
  reel_thumbnail: {
    kind: 'image',
    bucket: 'public',
    mimeTypes: IMAGE_TYPES,
    maxBytes: () => 5 * MB,
  },
  kyc_document: {
    kind: 'document',
    bucket: 'private',
    mimeTypes: DOC_TYPES,
    maxBytes: () => 10 * MB,
  },
  knowledge_document: {
    kind: 'document',
    bucket: 'private',
    mimeTypes: KNOWLEDGE_TYPES,
    maxBytes: () => 25 * MB,
  },
  landmark_photo: {
    kind: 'image',
    bucket: 'private',
    mimeTypes: IMAGE_TYPES,
    maxBytes: () => 10 * MB,
  },
  voice_note: { kind: 'audio', bucket: 'private', mimeTypes: AUDIO_TYPES, maxBytes: () => 10 * MB },
};

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'text/markdown': 'md',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
  'audio/wav': 'wav',
};

export function extensionFor(mimeType: string): string {
  return EXTENSIONS[mimeType] ?? 'bin';
}

/** Storage keys start with the purpose, which also determines the bucket. */
export function purposeOfKey(storageKey: string): UploadPurpose | null {
  const prefix = storageKey.split('/')[0];
  return (UPLOAD_PURPOSES as readonly string[]).includes(prefix ?? '')
    ? (prefix as UploadPurpose)
    : null;
}

export function bucketOfKey(storageKey: string): Bucket {
  if (storageKey.startsWith('generated-public/')) return 'public';
  if (storageKey.startsWith('generated-private/')) return 'private';
  const purpose = purposeOfKey(storageKey);
  return purpose ? PURPOSE_RULES[purpose].bucket : 'private';
}
