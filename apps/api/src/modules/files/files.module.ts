import { Module } from '@nestjs/common';
import { FilesController } from './controllers/files.controller';
import { FilesFacade } from './files.facade';
import { MediaProcessor } from './processors/media.processor';
import { FilesService } from './services/files.service';

@Module({
  controllers: [FilesController],
  providers: [FilesService, FilesFacade, MediaProcessor],
  exports: [FilesFacade],
})
export class FilesModule {}
