import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { LANGS, type Lang } from '@tirth-now/shared-types';

/** Body shape for every translatable field: English required, Hindi optional. */
export class I18nTextDto {
  @ApiProperty({ example: 'Shri Banke Bihari Temple' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  en!: string;

  @ApiPropertyOptional({ example: 'श्री बांके बिहारी मंदिर' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  hi?: string;
}

/** Plain JSON object for Prisma Json columns. */
export function i18nJson(dto: I18nTextDto): { en: string; hi?: string } {
  return dto.hi === undefined ? { en: dto.en } : { en: dto.en, hi: dto.hi };
}

/** Base for query DTOs on localised endpoints: allows `?lang=hi` through strict validation. */
export class LocalizedQueryDto {
  @ApiPropertyOptional({
    enum: LANGS,
    description: 'Response language (also read from Accept-Language)',
  })
  @IsOptional()
  @IsIn(LANGS)
  lang?: Lang;
}
