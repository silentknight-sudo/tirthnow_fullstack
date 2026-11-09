import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity';
import { NotificationsModule } from '../notifications';
import {
  FamilyController,
  TripShareController,
  TripsController,
} from './controllers/trips.controller';
import { TripsService } from './services/trips.service';

/** Trips, trip notifications, consent-based family live location, tracking links. */
@Module({
  imports: [IdentityModule, NotificationsModule],
  controllers: [TripsController, FamilyController, TripShareController],
  providers: [TripsService],
})
export class TripsModule {}
