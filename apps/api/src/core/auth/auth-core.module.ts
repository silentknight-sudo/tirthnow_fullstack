import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { APP_CONFIG, type AppConfig } from '../config';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

/**
 * JWT signing/verification + global guards. Order matters: authentication, then roles.
 * (ThrottlerGuard is registered before these by ThrottleModule so abuse is limited pre-auth.)
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        secret: config.jwt.accessSecret,
        signOptions: {
          algorithm: 'HS256',
          expiresIn: config.jwt.accessTtlSeconds,
          issuer: config.jwt.issuer,
        },
        verifyOptions: { algorithms: ['HS256'], issuer: config.jwt.issuer },
      }),
    }),
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [JwtModule],
})
export class AuthCoreModule {}
