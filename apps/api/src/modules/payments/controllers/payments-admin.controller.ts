import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type AuthPrincipal, CurrentUser, Roles } from '../../../core/auth';
import { AuditService } from '../../../core/audit';
import { AppException, type Page } from '../../../core/http';
import { Idempotent } from '../../../core/idempotency';
import { PrismaService } from '../../../core/prisma';
import {
  CommissionRuleDto,
  HoldPayoutDto,
  PayoutQueryDto,
  PayoutResponse,
  UpdateCommissionRuleDto,
} from '../dto/payments.dto';
import { PaymentsService } from '../services/payments.service';
import { PayoutsService } from '../services/payouts.service';

@ApiTags('admin · finance')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin')
export class PaymentsAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payouts: PayoutsService,
    private readonly paymentsService: PaymentsService,
    private readonly audit: AuditService,
  ) {}

  @Get('commission-rules')
  rules() {
    return this.prisma.commissionRule.findMany({
      orderBy: [{ isActive: 'desc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  @Post('commission-rules')
  async createRule(@CurrentUser() u: AuthPrincipal, @Body() dto: CommissionRuleDto) {
    const rule = await this.prisma.commissionRule.create({
      data: {
        name: dto.name,
        orderType: dto.orderType ?? null,
        vendorId: dto.vendorId ?? null,
        cityId: dto.cityId ?? null,
        percentBps: dto.percentBps,
        flatPaise: dto.flatPaise ?? 0,
        minPaise: dto.minPaise ?? null,
        maxPaise: dto.maxPaise ?? null,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        priority: dto.priority ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
    await this.audit.record({
      actor: u,
      action: 'commission_rule.create',
      entityType: 'commission_rule',
      entityId: rule.id,
      after: rule,
    });
    return rule;
  }

  @Patch('commission-rules/:id')
  async updateRule(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommissionRuleDto,
  ) {
    const before = await this.prisma.commissionRule.findUnique({ where: { id } });
    if (!before) throw AppException.notFound('Rule not found');
    // Rules already applied to orders are snapshotted; edits only affect future bookings.
    const rule = await this.prisma.commissionRule.update({
      where: { id },
      data: {
        name: dto.name,
        orderType: dto.orderType,
        vendorId: dto.vendorId,
        cityId: dto.cityId,
        percentBps: dto.percentBps,
        flatPaise: dto.flatPaise,
        minPaise: dto.minPaise,
        maxPaise: dto.maxPaise,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
        priority: dto.priority,
        isActive: dto.isActive,
      },
    });
    await this.audit.record({
      actor: u,
      action: 'commission_rule.update',
      entityType: 'commission_rule',
      entityId: id,
      before,
      after: rule,
    });
    return rule;
  }

  @Get('payouts')
  @ApiOkResponse({ type: [PayoutResponse] })
  listPayouts(@Query() q: PayoutQueryDto): Promise<Page<PayoutResponse>> {
    return this.payouts.list(q);
  }

  @Post('payouts/run')
  @HttpCode(200)
  @ApiOperation({ summary: 'Create payouts now for every vendor with a cleared balance' })
  async runPayouts(@CurrentUser() u: AuthPrincipal): Promise<{ created: number }> {
    const created = await this.payouts.scheduleAll();
    await this.audit.record({
      actor: u,
      action: 'payout.run',
      entityType: 'payout',
      after: { created },
    });
    return { created };
  }

  @Post('payouts/:id/approve')
  @HttpCode(200)
  @Idempotent('payout.approve')
  approve(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PayoutResponse> {
    return this.payouts.approve(u, id);
  }

  @Post('refunds/:id/retry')
  @HttpCode(200)
  @Idempotent('refund.retry')
  async retryRefund(@CurrentUser() u: AuthPrincipal, @Param('id', ParseUUIDPipe) id: string) {
    const refund = await this.paymentsService.retryRefund(id);
    await this.audit.record({
      actor: u,
      action: 'refund.retry',
      entityType: 'refund',
      entityId: id,
    });
    return refund;
  }

  @Post('payouts/:id/hold')
  @HttpCode(200)
  hold(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: HoldPayoutDto,
  ): Promise<PayoutResponse> {
    return this.payouts.hold(u, id, dto.reason);
  }

  @Get('payments')
  async payments(@Query('orderId', new ParseUUIDPipe({ optional: true })) orderId?: string) {
    return this.prisma.payment.findMany({
      where: orderId ? { orderId } : {},
      include: { events: { orderBy: { createdAt: 'asc' } }, refunds: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
