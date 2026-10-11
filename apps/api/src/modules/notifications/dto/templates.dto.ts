import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { NotifChannel } from '@prisma/client';
import { I18nTextDto } from '../../../core/i18n';
import { TEMPLATE_KEYS } from '../templates';

export class UpsertTemplateDto {
  @ApiProperty({ enum: TEMPLATE_KEYS }) @IsIn(TEMPLATE_KEYS) key!: string;
  @ApiProperty({ enum: NotifChannel }) @IsEnum(NotifChannel) channel!: NotifChannel;
  @ApiPropertyOptional({ type: I18nTextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => I18nTextDto)
  title?: I18nTextDto;
  @ApiProperty({ type: I18nTextDto }) @ValidateNested() @Type(() => I18nTextDto) body!: I18nTextDto;
  @ApiPropertyOptional({ description: 'DLT template id registered at the SMS gateway' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  dltTemplateId?: string;
  @ApiPropertyOptional({ description: 'Approved WhatsApp template name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  whatsappTemplateName?: string;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isActive?: boolean;
}
