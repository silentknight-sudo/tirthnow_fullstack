import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { CursorQueryDto } from '../../../core/http';

export class NotificationQueryDto extends CursorQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  unreadOnly?: boolean;
}

export class NotificationResponse {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true, type: String }) title!: string | null;
  @ApiProperty() body!: string;
  @ApiProperty({ type: 'object', additionalProperties: { type: 'string' } }) data!: Record<
    string,
    string
  >;
  @ApiProperty({ nullable: true, type: String }) readAt!: string | null;
  @ApiProperty() createdAt!: string;
}

export class NotificationPageResponse {
  @ApiProperty({ type: [NotificationResponse] }) data!: NotificationResponse[];
  @ApiProperty({ nullable: true, type: String }) nextCursor!: string | null;
  @ApiProperty() unreadCount!: number;
}

export class NotificationPreferencesDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() aartiReminders?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() bookingUpdates?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() marketing?: boolean;
  @ApiPropertyOptional({ minimum: 5, maximum: 120 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(120)
  defaultReminderMinutes?: number;
}

export class CreateAartiReminderDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() aartiScheduleId!: string;
  @ApiPropertyOptional({ minimum: 5, maximum: 120, description: 'Defaults to the preference (30)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(120)
  minutesBefore?: number;
}

export class AartiReminderResponse {
  @ApiProperty() id!: string;
  @ApiProperty() aartiScheduleId!: string;
  @ApiProperty() templeId!: string;
  @ApiProperty() templeName!: string;
  @ApiProperty() aartiName!: string;
  @ApiProperty() minutesBefore!: number;
  @ApiProperty({ nullable: true, type: String }) nextAartiAt!: string | null;
  @ApiProperty({ nullable: true, type: String }) nextReminderAt!: string | null;
}
