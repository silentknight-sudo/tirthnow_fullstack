import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog';
import { FilesModule } from '../files';
import { IdentityModule } from '../identity';
import { NotificationsModule } from '../notifications';
import { ReviewsModule } from '../reviews';
import { VendorsModule } from '../vendors';
import { ModerationAdminController } from './controllers/moderation-admin.controller';
import {
  CreatorsController,
  ReelsController,
  ReportsController,
} from './controllers/reels.controller';
import { VideoWebhookController } from './controllers/video-webhook.controller';
import { ReelMediaListener } from './listeners/media.listener';
import { ReviewFlaggedListener } from './listeners/review-flagged.listener';
import { ReelsFacade } from './reels.facade';
import { ModerationService } from './services/moderation.service';
import { ReelsService } from './services/reels.service';
import { SocialService } from './services/social.service';

@Module({
  imports: [
    FilesModule,
    CatalogModule,
    IdentityModule,
    ReviewsModule,
    VendorsModule,
    NotificationsModule,
  ],
  controllers: [
    ReelsController,
    CreatorsController,
    ReportsController,
    VideoWebhookController,
    ModerationAdminController,
  ],
  providers: [
    ReelsService,
    SocialService,
    ModerationService,
    ReviewFlaggedListener,
    ReelMediaListener,
    ReelsFacade,
  ],
  exports: [ReelsFacade],
})
export class ReelsModule {}
