import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { type Request, type Response } from 'express';
import { Public } from '../auth';
import { AppException } from '../http';
import {
  type Bucket,
  MockEmailAdapter,
  MockPushAdapter,
  MockSmsAdapter,
  MockStorageAdapter,
  MockWhatsAppAdapter,
  type OutboxEntry,
  type SentPush,
  type SentSms,
  type SentWhatsApp,
} from '../providers';

const MAX_UPLOAD = 250 * 1024 * 1024;

/** Express 5 named wildcards yield the path segments as an array. */
function joinKey(value: string | string[]): string {
  return Array.isArray(value) ? value.join('/') : value;
}

function bucketOf(value: string): Bucket {
  if (value !== 'public' && value !== 'private') throw AppException.notFound();
  return value;
}

/** Non-production helpers. Registered only when NODE_ENV !== production. */
@ApiExcludeController()
@Public()
@SkipThrottle()
@Controller('dev')
export class DevController {
  constructor(
    private readonly mockEmail: MockEmailAdapter,
    private readonly mockPush: MockPushAdapter,
    private readonly mockSms: MockSmsAdapter,
    private readonly mockWhatsApp: MockWhatsAppAdapter,
    private readonly mockStorage: MockStorageAdapter,
  ) {}

  /** Messages captured by mock providers (EMAIL/PUSH/SMS/WHATSAPP_PROVIDER=mock). */
  @Get('outbox')
  outbox(): { email: OutboxEntry[]; push: SentPush[]; sms: SentSms[]; whatsapp: SentWhatsApp[] } {
    return {
      email: this.mockEmail.outbox,
      push: this.mockPush.outbox,
      sms: this.mockSms.outbox,
      whatsapp: this.mockWhatsApp.outbox,
    };
  }

  /** Target of mock presigned PUT URLs (STORAGE_PROVIDER=mock). */
  @Put('storage/:bucket/*key')
  @HttpCode(200)
  async upload(
    @Param('bucket') bucketParam: string,
    @Param('key') keyParam: string | string[],
    @Query('expires', ParseIntPipe) expires: number,
    @Query('sig') sig: string,
    @Req() req: Request,
  ): Promise<{ ok: true }> {
    const bucket = bucketOf(bucketParam);
    const key = joinKey(keyParam);
    if (!this.mockStorage.verify(bucket, key, expires, 'PUT', sig)) throw AppException.forbidden();
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req as AsyncIterable<Buffer>) {
      size += chunk.length;
      if (size > MAX_UPLOAD) throw AppException.badRequest('Too large');
      chunks.push(chunk);
    }
    await this.mockStorage.put(
      bucket,
      key,
      Buffer.concat(chunks),
      req.get('content-type') ?? 'application/octet-stream',
    );
    return { ok: true };
  }

  /** Mock object download (public objects need no signature). */
  @Get('storage/:bucket/*key')
  download(
    @Param('bucket') bucketParam: string,
    @Param('key') keyParam: string | string[],
    @Query('expires') expires: string | undefined,
    @Query('sig') sig: string | undefined,
    @Res() res: Response,
  ): void {
    const bucket = bucketOf(bucketParam);
    const key = joinKey(keyParam);
    if (
      bucket === 'private' &&
      !(sig && expires && this.mockStorage.verify(bucket, key, Number(expires), 'GET', sig))
    ) {
      throw AppException.forbidden();
    }
    const obj = this.mockStorage.get(bucket, key);
    if (!obj) throw AppException.notFound();
    res.setHeader('Content-Type', obj.contentType);
    res.send(obj.body);
  }
}
