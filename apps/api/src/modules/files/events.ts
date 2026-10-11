import { type MediaKind } from '@prisma/client';
import { type UploadPurpose } from './services/upload-policy';

export const FILES_EVENTS = {
  /** An upload passed verification and is ready (images have variants). */
  uploaded: 'media.uploaded',
  /** An upload was rejected by verification (content type mismatch, undecodable). */
  rejected: 'media.rejected',
} as const;

export interface MediaReadyEvent {
  mediaId: string;
  kind: MediaKind;
  purpose: UploadPurpose | null;
}
