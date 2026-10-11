import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsString, Matches, Max, Min } from 'class-validator';
import { UPLOAD_PURPOSES, type UploadPurpose } from '../services/upload-policy';

export class PresignUploadDto {
  @ApiProperty({ enum: UPLOAD_PURPOSES })
  @IsIn(UPLOAD_PURPOSES)
  purpose!: UploadPurpose;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @Matches(/^[a-z]+\/[a-z0-9.+-]+$/)
  mimeType!: string;

  @ApiProperty({ example: 524288, description: 'Exact size of the file to upload, in bytes' })
  @IsInt()
  @Min(1)
  @Max(2 * 1024 * 1024 * 1024)
  sizeBytes!: number;
}

export class PresignUploadResponse {
  @ApiProperty({ format: 'uuid' }) mediaId!: string;
  @ApiProperty() uploadUrl!: string;
  @ApiProperty({ enum: ['PUT'] }) method!: 'PUT';
  @ApiProperty({ type: 'object', additionalProperties: { type: 'string' } }) headers!: Record<
    string,
    string
  >;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
}

export class MediaAssetResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: ['image', 'video', 'document', 'audio'] }) kind!: string;
  @ApiProperty({ enum: ['pending_upload', 'uploaded', 'processing', 'ready', 'failed'] })
  status!: string;
  @ApiProperty() mimeType!: string;
  @ApiPropertyOptional({ type: Number, nullable: true }) sizeBytes!: number | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) width!: number | null;
  @ApiPropertyOptional({ type: Number, nullable: true }) height!: number | null;
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Public or short-lived signed URL',
  })
  url!: string | null;
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    description: 'Variant name → URL',
  })
  variants!: Record<string, string>;
}
