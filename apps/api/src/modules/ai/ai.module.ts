import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog';
import { FilesModule } from '../files';
import { WeatherModule } from '../weather';
import { AiFacade } from './ai.facade';
import { AiController } from './controllers/ai.controller';
import { ChatController } from './controllers/chat.controller';
import { KnowledgeAdminController } from './controllers/knowledge-admin.controller';
import { AiProcessor } from './processors/ai.processor';
import { AiToolsService } from './services/ai-tools';
import { ChatService } from './services/chat.service';
import { ItinerariesService } from './services/itineraries.service';
import { KnowledgeService } from './services/knowledge.service';
import { MediaAiService } from './services/media-ai.service';
import { PlannerService } from './services/planner.service';
import { QuotaService } from './services/quota.service';

@Module({
  imports: [CatalogModule, FilesModule, WeatherModule],
  controllers: [ChatController, AiController, KnowledgeAdminController],
  providers: [
    QuotaService,
    KnowledgeService,
    AiToolsService,
    ChatService,
    PlannerService,
    ItinerariesService,
    MediaAiService,
    AiProcessor,
    AiFacade,
  ],
  exports: [AiFacade],
})
export class AiModule {}
