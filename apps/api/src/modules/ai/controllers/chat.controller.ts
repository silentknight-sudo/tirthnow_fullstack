import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { type Lang } from '@tirth-now/shared-types';
import { type Response } from 'express';
import { type AuthPrincipal, CurrentUser } from '../../../core/auth';
import { CursorQueryDto } from '../../../core/http';
import { ReqLang } from '../../../core/i18n';
import { ChatMessageDto, CreateChatSessionDto } from '../dto/ai.dto';
import { ChatService } from '../services/chat.service';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai/chat/sessions')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post()
  create(
    @CurrentUser() u: AuthPrincipal,
    @Body() dto: CreateChatSessionDto,
    @ReqLang() lang: Lang,
  ) {
    return this.chat.createSession(u, dto, lang);
  }

  @Get()
  list(@CurrentUser() u: AuthPrincipal, @Query() q: CursorQueryDto) {
    return this.chat.listSessions(u, q);
  }

  @Get(':id')
  get(@CurrentUser() u: AuthPrincipal, @Param('id', ParseUUIDPipe) id: string) {
    return this.chat.getSession(u, id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.chat.deleteSession(u, id);
  }

  /** Server-sent events: `token` {text}, `citation` {n, documentId, title}, `done` {messageId}, `error` {code}. */
  @Post(':id/messages')
  @ApiOperation({ summary: 'Ask the Braj guide (SSE stream)' })
  @ApiProduces('text/event-stream')
  async message(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChatMessageDto,
    @Res() res: Response,
  ): Promise<void> {
    // Not-found and quota errors are ordinary JSON responses (thrown before the stream opens).
    const prepared = await this.chat.prepare(u, id, dto.content);
    res.status(200).set({
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    });
    res.flushHeaders();
    let closed = false;
    res.on('close', () => {
      closed = true;
    });
    await this.chat.run(u, prepared, (event, data) => {
      if (!closed) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    });
    res.end();
  }
}
