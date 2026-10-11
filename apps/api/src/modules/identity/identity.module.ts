import { Module } from '@nestjs/common';
import { FilesModule } from '../files';
import { AuthController } from './controllers/auth.controller';
import { MeController } from './controllers/me.controller';
import { IdentityFacade } from './identity.facade';
import { AuthService } from './services/auth.service';
import { DevicesService } from './services/devices.service';
import { EmergencyContactsService } from './services/emergency-contacts.service';
import { OtpService } from './services/otp.service';
import { PasswordService } from './services/password.service';
import { ProfileService } from './services/profile.service';
import { TokenService } from './services/token.service';
import { UsersService } from './services/users.service';

@Module({
  imports: [FilesModule],
  controllers: [AuthController, MeController],
  providers: [
    AuthService,
    TokenService,
    UsersService,
    PasswordService,
    OtpService,
    DevicesService,
    ProfileService,
    EmergencyContactsService,
    IdentityFacade,
  ],
  exports: [IdentityFacade],
})
export class IdentityModule {}
