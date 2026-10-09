import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiExtraModels,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { type Request } from 'express';
import { type AuthPrincipal, CurrentUser, Public } from '../../../core/auth';
import { AuthThrottle } from '../../../core/throttle';
import {
  FirebaseExchangeDto,
  ForgotPasswordDto,
  LogoutDto,
  OtpVerifyDto,
  PortalLoginDto,
  RefreshDto,
  ResetPasswordDto,
} from '../dto/auth.dto';
import { AuthResultResponse, OtpChallengeResponse } from '../dto/auth-responses.dto';
import { AuthService } from '../services/auth.service';
import { type ClientContext } from '../services/token.service';

function clientContext(req: Request): ClientContext {
  return { ip: req.ip, userAgent: req.get('user-agent') };
}

@ApiTags('auth')
@ApiTooManyRequestsResponse({ description: 'Rate limited (RATE_LIMITED)' })
@AuthThrottle()
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('firebase')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a Firebase ID token (mobile) for API tokens' })
  @ApiOkResponse({ type: AuthResultResponse })
  @ApiUnauthorizedResponse({ description: 'AUTH_INVALID_FIREBASE_TOKEN | AUTH_ACCOUNT_SUSPENDED' })
  firebase(@Body() dto: FirebaseExchangeDto, @Req() req: Request): Promise<AuthResultResponse> {
    return this.auth.exchangeFirebaseToken(dto.idToken, dto.device, clientContext(req));
  }

  @Public()
  @Post('portal/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Portal email + password login; may require an OTP second step' })
  @ApiExtraModels(AuthResultResponse, OtpChallengeResponse)
  @ApiOkResponse({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(AuthResultResponse) },
        { $ref: getSchemaPath(OtpChallengeResponse) },
      ],
    },
  })
  @ApiUnauthorizedResponse({ description: 'AUTH_INVALID_CREDENTIALS | AUTH_ACCOUNT_SUSPENDED' })
  portalLogin(
    @Body() dto: PortalLoginDto,
    @Req() req: Request,
  ): Promise<AuthResultResponse | OtpChallengeResponse> {
    return this.auth.portalLogin(dto.email, dto.password, clientContext(req));
  }

  @Public()
  @Post('portal/otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete a portal login with the emailed 6-digit code' })
  @ApiOkResponse({ type: AuthResultResponse })
  @ApiUnauthorizedResponse({ description: 'AUTH_OTP_INVALID | AUTH_OTP_EXPIRED' })
  verifyOtp(@Body() dto: OtpVerifyDto, @Req() req: Request): Promise<AuthResultResponse> {
    return this.auth.verifyPortalOtp(dto.challengeId, dto.code, clientContext(req));
  }

  @Public()
  @Post('portal/password/forgot')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Email a password reset link (always 202)' })
  @ApiAcceptedResponse()
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    await this.auth.requestPasswordReset(dto.email);
  }

  @Public()
  @Post('portal/password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set a new password with a reset token; signs out all sessions' })
  @ApiNoContentResponse()
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.auth.resetPassword(dto.token, dto.password);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate a refresh token. Reusing an old token revokes the whole session.',
  })
  @ApiOkResponse({ type: AuthResultResponse })
  @ApiUnauthorizedResponse({
    description: 'AUTH_REFRESH_INVALID | AUTH_REFRESH_REUSED | AUTH_ACCOUNT_SUSPENDED',
  })
  refresh(@Body() dto: RefreshDto, @Req() req: Request): Promise<AuthResultResponse> {
    return this.auth.refresh(dto.refreshToken, clientContext(req));
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke the current session (or all sessions)' })
  @ApiNoContentResponse()
  async logout(@CurrentUser() user: AuthPrincipal, @Body() dto: LogoutDto): Promise<void> {
    await this.auth.logout(user.userId, user.sessionId, dto.allSessions === true);
  }
}
