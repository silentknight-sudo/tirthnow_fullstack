import { Controller, HttpCode, Inject, Logger, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { ERROR_CODES } from '@tirth-now/shared-types';
import { type Request } from 'express';
import { Public } from '../../../core/auth';
import { AppException } from '../../../core/http';
import { VIDEO_PROVIDER, type VideoProvider } from '../../../core/providers';
import { ReelsService } from '../services/reels.service';

type RawRequest = Request & { rawBody?: Buffer };

@ApiTags('reels')
@Public()
@SkipThrottle()
@Controller('reels/webhooks')
export class VideoWebhookController {
  private readonly logger = new Logger(VideoWebhookController.name);

  constructor(
    private readonly reels: ReelsService,
    @Inject(VIDEO_PROVIDER) private readonly video: VideoProvider,
  ) {}

  @Post('video')
  @HttpCode(200)
  @ApiOperation({ summary: 'Transcode completion from the video provider (signature-verified)' })
  async webhook(@Req() req: RawRequest): Promise<{ status: string }> {
    if (!req.rawBody) throw AppException.badRequest('Raw body unavailable');
    const headers: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(req.headers))
      headers[k.toLowerCase()] = Array.isArray(v) ? v[0] : v;
    if (!this.video.verifyWebhook(req.rawBody, headers)) {
      throw new AppException(
        ERROR_CODES.WEBHOOK_SIGNATURE_INVALID,
        401,
        'Invalid webhook signature',
      );
    }
    const event = this.video.parseWebhook(req.rawBody);
    switch (event.kind) {
      case 'ready':
        await this.reels.markReady(event.providerAssetId, event.playback);
        return { status: 'ready' };
      case 'errored':
        await this.reels.markFailed(event.providerAssetId, event.reason);
        return { status: 'errored' };
      case 'ignored':
        this.logger.debug({ type: event.type }, 'video webhook ignored');
        return { status: 'ignored' };
    }
  }
}
