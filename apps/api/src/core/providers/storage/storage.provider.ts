export type Bucket = 'public' | 'private';

export interface PresignedUpload {
  url: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresAt: Date;
}

export interface ObjectInfo {
  sizeBytes: number;
  contentType: string | undefined;
}

/** S3-compatible object storage (Cloudflare R2 in production, MinIO locally). */
export interface StorageProvider {
  presignPut(
    bucket: Bucket,
    key: string,
    contentType: string,
    expiresInSeconds: number,
  ): Promise<PresignedUpload>;
  presignGet(bucket: Bucket, key: string, expiresInSeconds: number): Promise<string>;
  /** Stable URL for objects in the public bucket. */
  publicUrl(key: string): string;
  head(bucket: Bucket, key: string): Promise<ObjectInfo | null>;
  /** Reads at most `maxBytes` (whole object when omitted). */
  read(bucket: Bucket, key: string, maxBytes?: number): Promise<Buffer>;
  put(bucket: Bucket, key: string, body: Buffer, contentType: string): Promise<void>;
  delete(bucket: Bucket, key: string): Promise<void>;
}

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');
