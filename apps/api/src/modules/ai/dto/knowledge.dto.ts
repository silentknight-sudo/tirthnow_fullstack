import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { KdocStatus } from '@prisma/client';
import { CursorQueryDto } from '../../../core/http';

export class CreateKnowledgeDocumentDto {
  @ApiProperty({ example: 'Vrindavan parikrama guide' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;
  @ApiProperty({ enum: ['text', 'upload'] }) @IsIn(['text', 'upload']) sourceType!:
    'text' | 'upload';
  @ApiPropertyOptional({ description: 'Markdown or plain text (sourceType=text)' })
  @ValidateIf((o: CreateKnowledgeDocumentDto) => o.sourceType === 'text')
  @IsString()
  @MinLength(20)
  @MaxLength(400_000)
  text?: string;
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'knowledge_document upload (sourceType=upload)',
  })
  @ValidateIf((o: CreateKnowledgeDocumentDto) => o.sourceType === 'upload')
  @IsUUID()
  mediaId?: string;
  @ApiPropertyOptional({ description: 'Where the content came from (book, website, temple trust)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  sourceRef?: string;
  @ApiPropertyOptional({ enum: ['en', 'hi'], default: 'en' })
  @IsOptional()
  @IsIn(['en', 'hi'])
  lang?: 'en' | 'hi';
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() cityId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() templeId?: string;
}

export class KnowledgeQueryDto extends CursorQueryDto {
  @ApiPropertyOptional({ enum: KdocStatus }) @IsOptional() @IsEnum(KdocStatus) status?: KdocStatus;
}
