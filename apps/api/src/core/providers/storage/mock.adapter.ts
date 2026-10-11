import { createHmac, randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config';
import {
  type Bucket,
  type ObjectInfo,
  type PresignedUpload,
  type StorageProvider,
} from './storage.provider';

const encodeKey = (key: string) => key.split('/').map(encodeURIComponent).join('/');

interface StoredObject {
  body: Buffer;
  contentType: string;
}

/**
 * In-memory storage for tests and accountless local runs. Presigned URLs point at the API's
 * dev routes (`/v1/dev/storage/...`), signed with an HMAC so they behave like real ones.
 */
@Injectable()
export class MockStorageAdapter implements StorageProvider {
  private readonly objects = new Map<string, StoredObject>();
  private readonly secret = randomUUID();

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  private id(bucket: Bucket, key: string): string {
    return `${bucket}/${key}`;
  }

  sign(bucket: Bucket, key: string, expires: number, method: 'GET' | 'PUT'): string {
    return createHmac('sha256', this.secret)
      .update(`${method}\n${bucket}\n${key}\n${expires}`)
      .digest('hex');
  }

  verify(
    bucket: Bucket,
    key: string,
    expires: number,
    method: 'GET' | 'PUT',
    signature: string,
  ): boolean {
    return expires > Date.now() && this.sign(bucket, key, expires, method) === signature;
  }

  private url(bucket: Bucket, key: string, method: 'GET' | 'PUT', expires: number): string {
    const sig = this.sign(bucket, key, expires, method);
    return `${this.config.publicUrl}/v1/dev/storage/${bucket}/${encodeKey(key)}?expires=${expires}&sig=${sig}`;
  }

  presignPut(
    bucket: Bucket,
    key: string,
    contentType: string,
    expiresInSeconds: number,
  ): Promise<PresignedUpload> {
    const expires = Date.now() + expiresInSeconds * 1000;
    return Promise.resolve({
      url: this.url(bucket, key, 'PUT', expires),
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      expiresAt: new Date(expires),
    });
  }

  presignGet(bucket: Bucket, key: string, expiresInSeconds: number): Promise<string> {
    return Promise.resolve(this.url(bucket, key, 'GET', Date.now() + expiresInSeconds * 1000));
  }

  publicUrl(key: string): string {
    return `${this.config.publicUrl}/v1/dev/storage/public/${encodeKey(key)}`;
  }

  head(bucket: Bucket, key: string): Promise<ObjectInfo | null> {
    const obj = this.objects.get(this.id(bucket, key));
    return Promise.resolve(
      obj ? { sizeBytes: obj.body.length, contentType: obj.contentType } : null,
    );
  }

  read(bucket: Bucket, key: string, maxBytes?: number): Promise<Buffer> {
    const obj = this.objects.get(this.id(bucket, key));
    if (!obj) return Promise.reject(new Error(`No such object ${bucket}/${key}`));
    return Promise.resolve(maxBytes === undefined ? obj.body : obj.body.subarray(0, maxBytes));
  }

  put(bucket: Bucket, key: string, body: Buffer, contentType: string): Promise<void> {
    this.objects.set(this.id(bucket, key), { body, contentType });
    return Promise.resolve();
  }

  delete(bucket: Bucket, key: string): Promise<void> {
    this.objects.delete(this.id(bucket, key));
    return Promise.resolve();
  }

  get(bucket: Bucket, key: string): StoredObject | undefined {
    return this.objects.get(this.id(bucket, key));
  }
}
