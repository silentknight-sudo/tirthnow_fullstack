import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type AuthPrincipal, CurrentUser } from '../../../core/auth';
import { MediaAssetResponse, PresignUploadDto, PresignUploadResponse } from '../dto/files.dto';
import { FilesService } from '../services/files.service';

@ApiTags('files')
@ApiBearerAuth()
@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post('presign')
  @ApiOperation({ summary: 'Get a presigned URL to PUT a file directly to storage' })
  presign(
    @CurrentUser() user: AuthPrincipal,
    @Body() dto: PresignUploadDto,
  ): Promise<PresignUploadResponse> {
    return this.files.presign(user, dto);
  }

  @Post(':id/complete')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Confirm the upload; the file is verified and processed in the background',
  })
  @ApiOkResponse({ type: MediaAssetResponse })
  complete(
    @CurrentUser() user: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MediaAssetResponse> {
    return this.files.complete(user, id);
  }

  @Get(':id')
  @ApiOkResponse({ type: MediaAssetResponse })
  get(
    @CurrentUser() user: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MediaAssetResponse> {
    return this.files.get(user, id);
  }
}
