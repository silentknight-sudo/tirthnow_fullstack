import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type AuthPrincipal, CurrentUser, NoGuests } from '../../../core/auth';
import {
  AddBankAccountDto,
  AddKycDocumentDto,
  BankAccountResponse,
  CreateVendorDto,
  InviteStaffDto,
  KycDocumentResponse,
  StaffResponse,
  UpdateStaffDto,
  UpdateVendorDto,
  VendorResponse,
} from '../dto/vendors.dto';
import { BankAccountsService } from '../services/bank-accounts.service';
import { StaffService } from '../services/staff.service';
import { VendorsService } from '../services/vendors.service';
import { VendorAccessGuard, VendorPermissionRequired } from '../vendor-access.guard';

@ApiTags('vendors')
@ApiBearerAuth()
@NoGuests()
@Controller('vendors')
export class VendorsController {
  constructor(
    private readonly vendors: VendorsService,
    private readonly staff: StaffService,
    private readonly bank: BankAccountsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Start vendor onboarding (draft). Refresh your token afterwards to get vendor claims.',
  })
  create(
    @CurrentUser() user: AuthPrincipal,
    @Body() dto: CreateVendorDto,
  ): Promise<VendorResponse> {
    return this.vendors.create(user, dto);
  }

  @Get('me')
  @ApiOkResponse({ type: [VendorResponse] })
  mine(@CurrentUser() user: AuthPrincipal): Promise<VendorResponse[]> {
    return this.vendors.mine(user);
  }

  @Get(':vid')
  @UseGuards(VendorAccessGuard)
  @ApiOkResponse({ type: VendorResponse })
  detail(
    @CurrentUser() user: AuthPrincipal,
    @Param('vid', ParseUUIDPipe) vid: string,
  ): Promise<VendorResponse> {
    return this.vendors.detail(user, vid);
  }

  @Patch(':vid')
  @UseGuards(VendorAccessGuard)
  @VendorPermissionRequired('owner')
  update(
    @CurrentUser() user: AuthPrincipal,
    @Param('vid', ParseUUIDPipe) vid: string,
    @Body() dto: UpdateVendorDto,
  ): Promise<VendorResponse> {
    return this.vendors.update(user, vid, dto);
  }

  @Post(':vid/kyc-documents')
  @UseGuards(VendorAccessGuard)
  @VendorPermissionRequired('owner')
  addKyc(
    @CurrentUser() user: AuthPrincipal,
    @Param('vid', ParseUUIDPipe) vid: string,
    @Body() dto: AddKycDocumentDto,
  ): Promise<KycDocumentResponse> {
    return this.vendors.addKycDocument(user, vid, dto);
  }

  @Delete(':vid/kyc-documents/:docId')
  @UseGuards(VendorAccessGuard)
  @VendorPermissionRequired('owner')
  @HttpCode(204)
  async removeKyc(
    @CurrentUser() user: AuthPrincipal,
    @Param('vid', ParseUUIDPipe) vid: string,
    @Param('docId', ParseUUIDPipe) docId: string,
  ): Promise<void> {
    await this.vendors.removeKycDocument(user, vid, docId);
  }

  @Post(':vid/submit')
  @UseGuards(VendorAccessGuard)
  @VendorPermissionRequired('owner')
  @HttpCode(200)
  @ApiOperation({ summary: 'Submit the application for KYC review' })
  submit(
    @CurrentUser() user: AuthPrincipal,
    @Param('vid', ParseUUIDPipe) vid: string,
  ): Promise<VendorResponse> {
    return this.vendors.submit(user, vid);
  }

  @Get(':vid/staff')
  @UseGuards(VendorAccessGuard)
  @VendorPermissionRequired('owner')
  @ApiOkResponse({ type: [StaffResponse] })
  listStaff(@Param('vid', ParseUUIDPipe) vid: string): Promise<StaffResponse[]> {
    return this.staff.list(vid);
  }

  @Post(':vid/staff')
  @UseGuards(VendorAccessGuard)
  @VendorPermissionRequired('owner')
  inviteStaff(
    @CurrentUser() user: AuthPrincipal,
    @Param('vid', ParseUUIDPipe) vid: string,
    @Body() dto: InviteStaffDto,
  ): Promise<StaffResponse> {
    return this.staff.invite(user, vid, dto);
  }

  @Patch(':vid/staff/:staffId')
  @UseGuards(VendorAccessGuard)
  @VendorPermissionRequired('owner')
  updateStaff(
    @CurrentUser() user: AuthPrincipal,
    @Param('vid', ParseUUIDPipe) vid: string,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @Body() dto: UpdateStaffDto,
  ): Promise<StaffResponse> {
    return this.staff.update(user, vid, staffId, dto);
  }

  @Delete(':vid/staff/:staffId')
  @UseGuards(VendorAccessGuard)
  @VendorPermissionRequired('owner')
  @HttpCode(204)
  async removeStaff(
    @CurrentUser() user: AuthPrincipal,
    @Param('vid', ParseUUIDPipe) vid: string,
    @Param('staffId', ParseUUIDPipe) staffId: string,
  ): Promise<void> {
    await this.staff.remove(user, vid, staffId);
  }

  @Get(':vid/bank-accounts')
  @UseGuards(VendorAccessGuard)
  @VendorPermissionRequired('finance.view')
  @ApiOkResponse({ type: [BankAccountResponse] })
  listBank(@Param('vid', ParseUUIDPipe) vid: string): Promise<BankAccountResponse[]> {
    return this.bank.list(vid);
  }

  @Post(':vid/bank-accounts')
  @UseGuards(VendorAccessGuard)
  @VendorPermissionRequired('owner')
  addBank(
    @CurrentUser() user: AuthPrincipal,
    @Param('vid', ParseUUIDPipe) vid: string,
    @Body() dto: AddBankAccountDto,
  ): Promise<BankAccountResponse> {
    return this.bank.add(user, vid, dto);
  }

  @Post(':vid/bank-accounts/:accountId/primary')
  @UseGuards(VendorAccessGuard)
  @VendorPermissionRequired('owner')
  @HttpCode(200)
  makePrimary(
    @CurrentUser() user: AuthPrincipal,
    @Param('vid', ParseUUIDPipe) vid: string,
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ): Promise<BankAccountResponse[]> {
    return this.bank.makePrimary(user, vid, accountId);
  }
}
