import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { VehicleClass } from '@prisma/client';
import { PointDto } from './common.dto';

export const VEHICLE_REG = /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/;

export class CreateVehicleDto {
  @ApiProperty({ enum: VehicleClass }) @IsEnum(VehicleClass) class!: VehicleClass;
  @ApiProperty({ example: 'UP85AT1001' })
  @Matches(VEHICLE_REG, { message: 'registrationNo must look like UP85AT1001' })
  registrationNo!: string;
  @ApiPropertyOptional({ example: 'Maruti Dzire' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  model?: string;
  @ApiProperty({ example: 4 }) @IsInt() @Min(1) @Max(30) seats!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) driverName?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^\+[1-9]\d{6,14}$/) driverPhoneE164?: string;
  @ApiPropertyOptional({ format: 'uuid', description: 'Driver app user, for live location' })
  @IsOptional()
  @IsUUID()
  driverUserId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateVehicleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) model?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(30) seats?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) driverName?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^\+[1-9]\d{6,14}$/) driverPhoneE164?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() driverUserId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class FixedRouteDto {
  @ApiProperty({ example: 'mathura' }) @Matches(/^[a-z0-9-]{2,60}$/) from!: string;
  @ApiProperty({ example: 'vrindavan' }) @Matches(/^[a-z0-9-]{2,60}$/) to!: string;
  @ApiProperty({ example: 45000 }) @IsInt() @Min(0) @Max(10_000_00) farePaise!: number;
}

export class UpsertCabFareDto {
  @ApiProperty({ example: 10000 }) @IsInt() @Min(0) @Max(10_000_00) baseFarePaise!: number;
  @ApiProperty({ example: 1400 }) @IsInt() @Min(0) @Max(100_00) perKmPaise!: number;
  @ApiProperty({ example: 100 }) @IsInt() @Min(0) @Max(100_00) perMinPaise!: number;
  @ApiProperty({ example: 25000 }) @IsInt() @Min(0) @Max(10_000_00) minFarePaise!: number;
  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  nightSurchargePct?: number;
  @ApiPropertyOptional({ type: [FixedRouteDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => FixedRouteDto)
  fixedRoutes?: FixedRouteDto[];
}

export class CabEstimateDto {
  @ApiProperty({ type: PointDto }) @ValidateNested() @Type(() => PointDto) pickup!: PointDto;
  @ApiProperty({ type: PointDto }) @ValidateNested() @Type(() => PointDto) drop!: PointDto;
  @ApiPropertyOptional({ description: 'Pickup time (ISO); default now' })
  @IsOptional()
  @IsDateString()
  at?: string;
  @ApiPropertyOptional({ enum: VehicleClass })
  @IsOptional()
  @IsEnum(VehicleClass)
  class?: VehicleClass;
}

export class VehicleResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: VehicleClass }) class!: VehicleClass;
  @ApiProperty() registrationNo!: string;
  @ApiProperty({ type: String, nullable: true }) model!: string | null;
  @ApiProperty() seats!: number;
  @ApiProperty({ type: String, nullable: true }) driverName!: string | null;
  @ApiProperty({ type: String, nullable: true }) driverPhoneE164!: string | null;
  @ApiProperty({ type: String, nullable: true }) driverUserId!: string | null;
  @ApiProperty() isActive!: boolean;
}

export class CabQuoteResponse {
  @ApiProperty({ enum: VehicleClass }) class!: VehicleClass;
  @ApiProperty({ format: 'uuid' }) vendorId!: string;
  @ApiProperty() vendorName!: string;
  @ApiProperty() farePaise!: number;
  @ApiProperty() distanceM!: number;
  @ApiProperty() durationS!: number;
  @ApiProperty() nightSurchargeApplied!: boolean;
  @ApiProperty() fixedRoute!: boolean;
  @ApiProperty() seats!: number;
}
