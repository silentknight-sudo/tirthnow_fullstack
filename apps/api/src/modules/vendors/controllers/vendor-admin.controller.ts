import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type AuthPrincipal, CurrentUser, Roles } from '../../../core/auth';
import { type Page } from '../../../core/http';
import { AdminVendorQueryDto, ReasonDto, ReviewKycDto, VendorResponse } from '../dto/vendors.dto';
import { VendorAdminService } from '../services/vendor-admin.service';

@ApiTags('admin · vendors')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/vendors')
export class VendorAdminController {
  constructor(private readonly admin: VendorAdminService) {}

  @Get()
  list(
    @CurrentUser() u: AuthPrincipal,
    @Query() q: AdminVendorQueryDto,
  ): Promise<Page<VendorResponse>> {
    return this.admin.list(u, q);
  }

  @Get(':id')
  detail(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VendorResponse> {
    return this.admin.detail(u, id);
  }

  @Post(':id/kyc-documents/:docId/review')
  @HttpCode(200)
  review(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('docId', ParseUUIDPipe) docId: string,
    @Body() dto: ReviewKycDto,
  ): Promise<VendorResponse> {
    return this.admin.reviewDocument(u, id, docId, dto);
  }

  @Post(':id/approve')
  @HttpCode(200)
  approve(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VendorResponse> {
    return this.admin.approve(u, id);
  }

  @Post(':id/reject')
  @HttpCode(200)
  reject(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReasonDto,
  ): Promise<VendorResponse> {
    return this.admin.reject(u, id, dto.reason);
  }

  @Post(':id/suspend')
  @HttpCode(200)
  suspend(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReasonDto,
  ): Promise<VendorResponse> {
    return this.admin.suspend(u, id, dto.reason);
  }

  @Post(':id/reinstate')
  @HttpCode(200)
  reinstate(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VendorResponse> {
    return this.admin.reinstate(u, id);
  }
}
