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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { type AuthPrincipal, CurrentUser, NoGuests } from '../../../core/auth';
import { AuthUserResponse } from '../dto/auth-responses.dto';
import {
  DeviceResponse,
  EmergencyContactDto,
  EmergencyContactResponse,
  ProfileResponse,
  RegisterDeviceDto,
  UpdateEmergencyContactDto,
  UpdateProfileDto,
} from '../dto/me.dto';
import { AuthService } from '../services/auth.service';
import { DevicesService } from '../services/devices.service';
import { EmergencyContactsService } from '../services/emergency-contacts.service';
import { ProfileService } from '../services/profile.service';

@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(
    private readonly auth: AuthService,
    private readonly profile: ProfileService,
    private readonly devices: DevicesService,
    private readonly contacts: EmergencyContactsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Current user with roles' })
  @ApiOkResponse({ type: AuthUserResponse })
  me(@CurrentUser() user: AuthPrincipal): Promise<AuthUserResponse> {
    return this.auth.me(user.userId);
  }

  @Get('profile')
  @ApiOkResponse({ type: ProfileResponse })
  getProfile(@CurrentUser() user: AuthPrincipal): Promise<ProfileResponse> {
    return this.profile.get(user.userId);
  }

  @Patch('profile')
  @ApiOperation({
    summary: 'Update name, language, home city, avatar, accessibility and notification preferences',
  })
  @ApiOkResponse({ type: ProfileResponse })
  updateProfile(
    @CurrentUser() user: AuthPrincipal,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileResponse> {
    return this.profile.update(user.userId, dto);
  }

  @Delete()
  @NoGuests()
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete my account: personal data removed, sessions revoked' })
  @ApiNoContentResponse()
  async deleteAccount(@CurrentUser() user: AuthPrincipal): Promise<void> {
    await this.profile.deleteAccount(user.userId);
  }

  @Get('devices')
  @ApiOkResponse({ type: [DeviceResponse] })
  listDevices(@CurrentUser() user: AuthPrincipal): Promise<DeviceResponse[]> {
    return this.devices.list(user.userId);
  }

  @Post('devices')
  @HttpCode(200)
  @ApiOperation({ summary: 'Register or refresh this device and its FCM token' })
  @ApiOkResponse({ type: DeviceResponse })
  registerDevice(
    @CurrentUser() user: AuthPrincipal,
    @Body() dto: RegisterDeviceDto,
  ): Promise<DeviceResponse> {
    return this.devices.register(user.userId, dto);
  }

  @Delete('devices/:id')
  @HttpCode(204)
  async removeDevice(
    @CurrentUser() user: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.devices.remove(user.userId, id);
  }

  @Get('emergency-contacts')
  @NoGuests()
  @ApiOkResponse({ type: [EmergencyContactResponse] })
  listContacts(@CurrentUser() user: AuthPrincipal): Promise<EmergencyContactResponse[]> {
    return this.contacts.list(user.userId);
  }

  @Post('emergency-contacts')
  @NoGuests()
  @ApiOperation({ summary: 'Add an emergency contact (max 5)' })
  createContact(
    @CurrentUser() user: AuthPrincipal,
    @Body() dto: EmergencyContactDto,
  ): Promise<EmergencyContactResponse> {
    return this.contacts.create(user.userId, dto);
  }

  @Patch('emergency-contacts/:id')
  @NoGuests()
  updateContact(
    @CurrentUser() user: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmergencyContactDto,
  ): Promise<EmergencyContactResponse> {
    return this.contacts.update(user.userId, id, dto);
  }

  @Delete('emergency-contacts/:id')
  @NoGuests()
  @HttpCode(204)
  async removeContact(
    @CurrentUser() user: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.contacts.remove(user.userId, id);
  }
}
