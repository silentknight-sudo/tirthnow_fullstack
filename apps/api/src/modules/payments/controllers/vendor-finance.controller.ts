import { Controller, Get, Param, ParseUUIDPipe, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiProduces, ApiTags } from '@nestjs/swagger';
import { type Response } from 'express';
import { type Page } from '../../../core/http';
import { CursorQueryDto } from '../../../core/http';
import { VendorAccessGuard, VendorPermissionRequired } from '../../vendors';
import {
  EarningsResponse,
  PayoutPageResponse,
  PayoutResponse,
  StatementQueryDto,
} from '../dto/payments.dto';
import { PayoutsService } from '../services/payouts.service';
import { StatementsService } from '../services/statements.service';

@ApiTags('vendor · finance')
@ApiBearerAuth()
@UseGuards(VendorAccessGuard)
@VendorPermissionRequired('finance.view')
@Controller('vendors/:vid')
export class VendorFinanceController {
  constructor(
    private readonly payouts: PayoutsService,
    private readonly statements: StatementsService,
  ) {}

  @Get('earnings')
  @ApiOkResponse({ type: EarningsResponse })
  earnings(@Param('vid', ParseUUIDPipe) vid: string): Promise<EarningsResponse> {
    return this.payouts.earnings(vid);
  }

  @Get('payouts')
  @ApiOkResponse({ type: PayoutPageResponse })
  payouts_(
    @Param('vid', ParseUUIDPipe) vid: string,
    @Query() q: CursorQueryDto,
  ): Promise<Page<PayoutResponse>> {
    return this.payouts.list({
      vendorId: vid,
      ...(q.cursor ? { cursor: q.cursor } : {}),
      ...(q.limit ? { limit: q.limit } : {}),
    });
  }

  @Get('statement')
  @ApiProduces('application/pdf')
  async statement(
    @Param('vid', ParseUUIDPipe) vid: string,
    @Query() q: StatementQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const pdf = await this.statements.pdf(vid, q.month);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="tirth-now-statement-${q.month}.pdf"`,
    );
    res.send(pdf);
  }
}
