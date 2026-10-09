import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { MeController } from './controllers/me.controller';
import { IdentityFacade } from './identity.facade';
import { AuthService } from './services/auth.service';
import { OtpService } from './services/otp.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { UsersService } from './services/users.service';

@Module({
  controllers: [AuthController, MeController],
  providers: [AuthService, TokenService, UsersService, PasswordService, OtpService, IdentityFacade],
  exports: [IdentityFacade],
})
export class IdentityModule {}
