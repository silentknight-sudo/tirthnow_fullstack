import { Inject, Injectable } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { APP_CONFIG, type AppConfig } from '../../config';
import { callWithPolicy } from '../call-policy';
import {
  type Bucket,
  type ObjectInfo,
  type PresignedUpload,
  type StorageProvider,
} from './storage.provider';

/** Cloudflare R2 / MinIO / any S3-compatible store. */
@Injectable()
export class S3StorageAdapter implements StorageProvider {
  private readonly client: S3Client;
  private readonly buckets: Record<Bucket, string>;
  private readonly publicBase: string;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    const s = config.storage;
    if (!s.accessKeyId || !s.secretAccessKey) throw new Error('S3 credentials are not configured');
    this.client = new S3Client({
      region: s.region,
      ...(s.endpoint ? { endpoint: s.endpoint } : {}),
      forcePathStyle: true,
      // Presigned PUTs must not embed a checksum of an empty body (SDK default since 3.729),
      // otherwise R2/MinIO reject the client's upload.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      credentials: { accessKeyId: s.accessKeyId, secretAccessKey: s.secretAccessKey },
    });
    this.buckets = { public: s.publicBucket, private: s.privateBucket };
    this.publicBase = (s.publicBaseUrl ?? `${s.endpoint ?? ''}/${s.publicBucket}`).replace(
      /\/$/,
      '',
    );
  }

  async presignPut(
    bucket: Bucket,
    key: string,
    contentType: string,
    expiresIn: number,
  ): Promise<PresignedUpload> {
    const url = await getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.buckets[bucket], Key: key, ContentType: contentType }),
      { expiresIn },
    );
    return {
      url,
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    };
  }

  presignGet(bucket: Bucket, key: string, expiresIn: number): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.buckets[bucket], Key: key }),
      { expiresIn },
    );
  }

  publicUrl(key: string): string {
    return `${this.publicBase}/${key.split('/').map(encodeURIComponent).join('/')}`;
  }

  async head(bucket: Bucket, key: string): Promise<ObjectInfo | null> {
    try {
      const res = await callWithPolicy('s3', () =>
        this.client.send(new HeadObjectCommand({ Bucket: this.buckets[bucket], Key: key })),
      );
      return { sizeBytes: res.ContentLength ?? 0, contentType: res.ContentType };
    } catch (err) {
      if (err instanceof S3ServiceException && err.$metadata.httpStatusCode === 404) return null;
      throw err;
    }
  }

  async read(bucket: Bucket, key: string, maxBytes?: number): Promise<Buffer> {
    const res = await callWithPolicy('s3', () =>
      this.client.send(
        new GetObjectCommand({
          Bucket: this.buckets[bucket],
          Key: key,
          ...(maxBytes === undefined ? {} : { Range: `bytes=0-${maxBytes - 1}` }),
        }),
      ),
    );
    if (!res.Body) return Buffer.alloc(0);
    return Buffer.from(await res.Body.transformToByteArray());
  }

  async put(bucket: Bucket, key: string, body: Buffer, contentType: string): Promise<void> {
    await callWithPolicy('s3', () =>
      this.client.send(
        new PutObjectCommand({
          Bucket: this.buckets[bucket],
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      ),
    );
  }

  async delete(bucket: Bucket, key: string): Promise<void> {
    await callWithPolicy('s3', () =>
      this.client.send(new DeleteObjectCommand({ Bucket: this.buckets[bucket], Key: key })),
    );
  }
}
