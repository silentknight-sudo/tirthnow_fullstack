import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type AuthPrincipal, CurrentUser, Roles } from '../../../core/auth';
import { CreateKnowledgeDocumentDto, KnowledgeQueryDto } from '../dto/knowledge.dto';
import { docResponse, KnowledgeService } from '../services/knowledge.service';

@ApiTags('admin · knowledge')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/knowledge-documents')
export class KnowledgeAdminController {
  constructor(private readonly knowledge: KnowledgeService) {}

  @Get()
  list(@Query() q: KnowledgeQueryDto) {
    return this.knowledge.list(q);
  }

  @Post()
  async create(@CurrentUser() u: AuthPrincipal, @Body() dto: CreateKnowledgeDocumentDto) {
    return docResponse(await this.knowledge.create(u, dto));
  }

  @Post('sync-catalog')
  @HttpCode(200)
  sync(@CurrentUser() u: AuthPrincipal) {
    return this.knowledge.syncCatalog(u);
  }

  @Post(':id/approve')
  @HttpCode(200)
  approve(@CurrentUser() u: AuthPrincipal, @Param('id', ParseUUIDPipe) id: string) {
    return this.knowledge.approve(u, id);
  }

  @Post(':id/reindex')
  @HttpCode(200)
  reindex(@CurrentUser() u: AuthPrincipal, @Param('id', ParseUUIDPipe) id: string) {
    return this.knowledge.reindex(u, id);
  }

  @Post(':id/archive')
  @HttpCode(200)
  archive(@CurrentUser() u: AuthPrincipal, @Param('id', ParseUUIDPipe) id: string) {
    return this.knowledge.archive(u, id);
  }
}
