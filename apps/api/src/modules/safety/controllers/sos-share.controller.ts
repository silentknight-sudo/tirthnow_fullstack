import { Controller, Get, Header, Param, Req, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type Request, type Response } from 'express';
import { Public } from '../../../core/auth';
import { SharedSosResponse } from '../dto/safety.dto';
import { sharePageHtml, SosShareService } from '../services/sos-share.service';

/** Served at /s/:shareToken (outside /v1) so SMS links stay short. */
@ApiTags('safety')
@Public()
@Controller('s')
export class SosShareController {
  constructor(private readonly share: SosShareService) {}

  @Get(':shareToken')
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @ApiOperation({ summary: 'Live SOS location for shared contacts (JSON, or HTML for browsers)' })
  @ApiOkResponse({ type: SharedSosResponse })
  async view(
    @Param('shareToken') token: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SharedSosResponse | string> {
    const view = await this.share.view(token);
    if (req.accepts(['json', 'html']) === 'html') {
      res.type('html');
      return sharePageHtml(view);
    }
    return view;
  }
}
