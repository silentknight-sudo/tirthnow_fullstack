import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { FILES_EVENTS, type MediaReadyEvent } from '../../files';
import { ReelsService } from '../services/reels.service';

/** Reels wait for their video upload to pass verification before transcoding. */
@Injectable()
export class ReelMediaListener {
  private readonly logger = new Logger(ReelMediaListener.name);

  constructor(private readonly reels: ReelsService) {}

  @OnEvent(FILES_EVENTS.uploaded, { async: true, promisify: true })
  async onReady(e: MediaReadyEvent): Promise<void> {
    if (e.purpose === 'reel_video') await this.safely(e.mediaId, true);
  }

  @OnEvent(FILES_EVENTS.rejected, { async: true, promisify: true })
  async onRejected(e: MediaReadyEvent): Promise<void> {
    if (e.purpose === 'reel_video') await this.safely(e.mediaId, false);
  }

  private async safely(mediaId: string, ok: boolean): Promise<void> {
    try {
      await this.reels.onVideoChecked(mediaId, ok);
    } catch (err) {
      this.logger.error({ err, mediaId }, 'could not hand the reel video to transcoding');
    }
  }
}
