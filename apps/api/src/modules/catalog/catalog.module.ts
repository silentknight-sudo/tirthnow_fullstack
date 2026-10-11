import { Module } from '@nestjs/common';
import { FilesModule } from '../files';
import { CatalogAdminController } from './controllers/catalog-admin.controller';
import { CatalogController } from './controllers/catalog.controller';
import { CatalogFacade } from './catalog.facade';
import { AartiService } from './services/aarti.service';
import { CatalogAdminService } from './services/catalog-admin.service';
import { CatalogService } from './services/catalog.service';
import { SearchService } from './services/search.service';

@Module({
  imports: [FilesModule],
  controllers: [CatalogController, CatalogAdminController],
  providers: [CatalogService, AartiService, SearchService, CatalogAdminService, CatalogFacade],
  exports: [CatalogFacade],
})
export class CatalogModule {}
