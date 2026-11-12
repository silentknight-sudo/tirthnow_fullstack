import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog';
import { FilesModule } from '../files';
import { IdentityModule } from '../identity';
import { InventoryModule } from '../inventory';
import { NotificationsModule } from '../notifications';
import { OrdersModule } from '../orders';
import { VendorsModule } from '../vendors';
import {
  ReviewsController,
  VendorAnalyticsController,
  VendorReviewsController,
} from './controllers/reviews.controller';
import { ReviewsFacade } from './reviews.facade';
import { ReviewsService } from './services/reviews.service';
import { VendorReviewsService } from './services/vendor-reviews.service';

@Module({
  imports: [
    OrdersModule,
    CatalogModule,
    InventoryModule,
    FilesModule,
    IdentityModule,
    VendorsModule,
    NotificationsModule,
  ],
  controllers: [ReviewsController, VendorReviewsController, VendorAnalyticsController],
  providers: [ReviewsService, VendorReviewsService, ReviewsFacade],
  exports: [ReviewsFacade],
})
export class ReviewsModule {}
