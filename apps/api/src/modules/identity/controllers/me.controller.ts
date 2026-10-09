import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type AuthPrincipal, CurrentUser } from '../../../core/auth';
import { AuthUserResponse } from '../dto/auth-responses.dto';
import { AuthService } from '../services/auth.service';

@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly auth: AuthService) {}

  @Get()
  @ApiOperation({ summary: 'Current user with roles' })
  @ApiOkResponse({ type: AuthUserResponse })
  me(@CurrentUser() user: AuthPrincipal): Promise<AuthUserResponse> {
    return this.auth.me(user.userId);
  }
}
