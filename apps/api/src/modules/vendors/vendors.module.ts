import { Module } from '@nestjs/common';
import { FilesModule } from '../files';
import { IdentityModule } from '../identity';
import { VendorAdminController } from './controllers/vendor-admin.controller';
import { VendorsController } from './controllers/vendors.controller';
import { BankAccountsService } from './services/bank-accounts.service';
import { StaffService } from './services/staff.service';
import { VendorAccessService } from './services/vendor-access.service';
import { VendorAdminService } from './services/vendor-admin.service';
import { VendorsService } from './services/vendors.service';
import { VendorAccessGuard } from './vendor-access.guard';
import { VendorsFacade } from './vendors.facade';

@Module({
  imports: [IdentityModule, FilesModule],
  controllers: [VendorsController, VendorAdminController],
  providers: [
    VendorsService,
    VendorAccessService,
    StaffService,
    BankAccountsService,
    VendorAdminService,
    VendorAccessGuard,
    VendorsFacade,
  ],
  // VendorAccessService is exported so other modules can use VendorAccessGuard on their routes.
  exports: [VendorsFacade, VendorAccessService, VendorAccessGuard],
})
export class VendorsModule {}
