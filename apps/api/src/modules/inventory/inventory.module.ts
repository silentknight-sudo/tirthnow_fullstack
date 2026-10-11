import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog';
import { FilesModule } from '../files';
import { VendorsModule } from '../vendors';
import { InventoryController } from './controllers/inventory.controller';
import { VendorInventoryController } from './controllers/vendor-inventory.controller';
import { InventoryFacade } from './inventory.facade';
import { CabsService } from './services/cabs.service';
import { ExperiencesService } from './services/experiences.service';
import { HotelsService } from './services/hotels.service';
import { InventorySearchSource } from './services/inventory-search';
import { RestaurantsService } from './services/restaurants.service';
import { RoomInventoryService } from './services/room-inventory.service';

@Module({
  imports: [VendorsModule, CatalogModule, FilesModule],
  controllers: [InventoryController, VendorInventoryController],
  providers: [
    HotelsService,
    RoomInventoryService,
    CabsService,
    RestaurantsService,
    ExperiencesService,
    InventorySearchSource,
    InventoryFacade,
  ],
  exports: [InventoryFacade],
})
export class InventoryModule {}
