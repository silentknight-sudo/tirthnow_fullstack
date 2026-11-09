import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class StartTripDto {
  @ApiPropertyOptional({ maxLength: 80, example: 'Vrindavan yatra' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;
  @ApiPropertyOptional({ maxLength: 80, example: 'Delhi' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  fromPlace?: string;
  @ApiPropertyOptional({ format: 'uuid', description: 'A saved itinerary this trip follows' })
  @IsOptional()
  @IsUUID()
  itineraryId?: string;
  @ApiPropertyOptional({ description: 'Start sharing live location with family right away' })
  @IsOptional()
  @IsBoolean()
  shareLocation?: boolean;
}

export class TripLocationDto {
  @ApiProperty({ example: 27.5806 }) @IsLatitude() lat!: number;
  @ApiProperty({ example: 77.6996 }) @IsLongitude() lng!: number;
  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000)
  accuracyM?: number;
}

export class TripSharingDto {
  @ApiProperty({ description: 'true = share live location, false = pause' })
  @IsBoolean()
  sharing!: boolean;
}

export class TripResponse {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ nullable: true, type: String }) fromPlace!: string | null;
  @ApiProperty({ nullable: true, type: String }) itineraryId!: string | null;
  @ApiProperty({ enum: ['active', 'ended'] }) status!: 'active' | 'ended';
  @ApiProperty() startedAt!: string;
  @ApiProperty({ nullable: true, type: String }) endedAt!: string | null;
  @ApiProperty() sharingLocation!: boolean;
  @ApiProperty({ nullable: true, type: String, description: 'Tracking link, if created' })
  shareUrl!: string | null;
  @ApiProperty({ nullable: true, type: Number }) lastLat!: number | null;
  @ApiProperty({ nullable: true, type: Number }) lastLng!: number | null;
  @ApiProperty({ nullable: true, type: String }) lastLocationAt!: string | null;
}

export class TripPageResponse {
  @ApiProperty({ type: [TripResponse] }) data!: TripResponse[];
  @ApiProperty({ nullable: true, type: String }) nextCursor!: string | null;
}

export class TripShareResponse {
  @ApiProperty() shareUrl!: string;
  @ApiProperty({ description: 'Ready-made text for WhatsApp or SMS' }) message!: string;
}

export class SharedTripResponse {
  @ApiProperty() name!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ nullable: true, type: String }) fromPlace!: string | null;
  @ApiProperty({ enum: ['active', 'ended'] }) status!: 'active' | 'ended';
  @ApiProperty() startedAt!: string;
  @ApiProperty({ nullable: true, type: String }) endedAt!: string | null;
  @ApiProperty({ description: 'Location is shown only while the traveller shares it' })
  sharing!: boolean;
  @ApiProperty({ nullable: true, type: Number }) lat!: number | null;
  @ApiProperty({ nullable: true, type: Number }) lng!: number | null;
  @ApiProperty({ nullable: true, type: String }) locationAt!: string | null;
}

export class CreateFamilyGroupDto {
  @ApiProperty({ maxLength: 60, example: 'Sharma parivar' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;
}

export class JoinFamilyGroupDto {
  @ApiProperty({ example: 'K7P2QX' }) @Matches(/^[A-Za-z0-9]{6}$/) code!: string;
}

export class FamilySharingDto {
  @ApiProperty({ description: 'Consent: may this group see my live trip location?' })
  @IsBoolean()
  sharing!: boolean;
}

export class MemberTripResponse {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ nullable: true, type: String }) fromPlace!: string | null;
  @ApiProperty() startedAt!: string;
}

export class FamilyMemberResponse {
  @ApiProperty() userId!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) avatarUrl!: string | null;
  @ApiProperty() isOwner!: boolean;
  @ApiProperty() isMe!: boolean;
  @ApiProperty({ description: 'This member allows the group to see their location' })
  sharing!: boolean;
  @ApiProperty({ nullable: true, type: MemberTripResponse, description: 'Active trip, if any' })
  trip!: MemberTripResponse | null;
  @ApiProperty({ nullable: true, type: Number }) lat!: number | null;
  @ApiProperty({ nullable: true, type: Number }) lng!: number | null;
  @ApiProperty({ nullable: true, type: String }) locationAt!: string | null;
}

export class FamilyGroupResponse {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() joinCode!: string;
  @ApiProperty() isOwner!: boolean;
  @ApiProperty({ type: [FamilyMemberResponse] }) members!: FamilyMemberResponse[];
}
