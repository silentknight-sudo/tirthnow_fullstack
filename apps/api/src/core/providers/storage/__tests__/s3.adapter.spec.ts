import { loadConfig } from '../../../config';
import { S3StorageAdapter } from '../s3.adapter';

describe('S3StorageAdapter', () => {
  const config = loadConfig({
    DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
    REDIS_URL: 'redis://localhost:6379',
    JWT_ACCESS_SECRET: 'x'.repeat(40),
    DATA_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
    STORAGE_PROVIDER: 's3',
    S3_ENDPOINT: 'http://localhost:9000',
    S3_ACCESS_KEY_ID: 'minioadmin',
    S3_SECRET_ACCESS_KEY: 'minioadmin',
    MEDIA_PUBLIC_BASE_URL: 'https://media.example.com',
  });
  const adapter = new S3StorageAdapter(config);

  it('presigns PUT URLs without an embedded body checksum', async () => {
    const res = await adapter.presignPut('public', 'avatar/2026/10/x.png', 'image/png', 900);
    const url = new URL(res.url);
    expect(url.pathname).toBe('/tirthnow-public/avatar/2026/10/x.png');
    expect(url.searchParams.get('X-Amz-Signature')).toBeTruthy();
    expect([...url.searchParams.keys()].some((k) => k.toLowerCase().includes('checksum'))).toBe(
      false,
    );
    expect(res.headers).toEqual({ 'Content-Type': 'image/png' });
  });

  it('builds public URLs from the CDN base', () => {
    expect(adapter.publicUrl('avatar/2026/10/a b.png')).toBe(
      'https://media.example.com/avatar/2026/10/a%20b.png',
    );
  });
});
