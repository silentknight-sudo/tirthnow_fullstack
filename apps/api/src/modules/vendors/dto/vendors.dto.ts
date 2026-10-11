import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { KycDocType, VendorStatus, VendorType } from '@prisma/client';
import { CursorQueryDto } from '../../../core/http';
import { VENDOR_PERMISSIONS, type VendorPermission } from '../permissions';

export const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const PAN = /^[A-Z]{5}\d{4}[A-Z]$/;
export const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export class CreateVendorDto {
  @ApiProperty({ enum: VendorType }) @IsEnum(VendorType) type!: VendorType;
  @ApiProperty({ example: 'Shri Radha Hospitality Pvt Ltd' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  legalName!: string;
  @ApiProperty({ example: 'Shri Radha Residency' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  displayName!: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() cityId?: string;
  @ApiPropertyOptional({ example: '09ABCDE1234F1Z5' })
  @IsOptional()
  @Matches(GSTIN, { message: 'gstin is not a valid GSTIN' })
  gstin?: string;
  @ApiPropertyOptional({ example: 'ABCDE1234F' })
  @IsOptional()
  @Matches(PAN, { message: 'pan is not a valid PAN' })
  pan?: string;
}

export class UpdateVendorDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) @MaxLength(200) legalName?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  displayName?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() cityId?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(GSTIN) gstin?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(PAN) pan?: string;
}

export class AddKycDocumentDto {
  @ApiProperty({ enum: KycDocType }) @IsEnum(KycDocType) docType!: KycDocType;
  @ApiProperty({ format: 'uuid', description: 'Ready upload with purpose kyc_document' })
  @IsUUID()
  mediaId!: string;
}

export class InviteStaffDto {
  @ApiPropertyOptional({ example: 'manager@example.com' })
  @ValidateIf((o: InviteStaffDto) => o.phoneE164 === undefined)
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @ValidateIf((o: InviteStaffDto) => o.email === undefined)
  @Matches(/^\+[1-9]\d{6,14}$/)
  phoneE164?: string;

  @ApiProperty({ enum: VENDOR_PERMISSIONS, isArray: true })
  @IsArray()
  @ArrayUnique()
  @IsIn(VENDOR_PERMISSIONS, { each: true })
  permissions!: VendorPermission[];
}

export class UpdateStaffDto {
  @ApiPropertyOptional({ enum: VENDOR_PERMISSIONS, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(VENDOR_PERMISSIONS, { each: true })
  permissions?: VendorPermission[];

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class AddBankAccountDto {
  @ApiProperty({ example: 'Shri Radha Hospitality Pvt Ltd' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  accountHolder!: string;
  @ApiProperty({ example: '123456789012' })
  @Matches(/^\d{9,18}$/, { message: 'accountNumber must be 9-18 digits' })
  accountNumber!: string;
  @ApiProperty({ example: 'HDFC0001234' })
  @Matches(IFSC, { message: 'ifsc is not a valid IFSC' })
  ifsc!: string;
}

export class AdminVendorQueryDto extends CursorQueryDto {
  @ApiPropertyOptional({ enum: VendorStatus })
  @IsOptional()
  @IsEnum(VendorStatus)
  status?: VendorStatus;
}

export class ReviewKycDto {
  @ApiProperty({ enum: ['approved', 'rejected'] }) @IsIn(['approved', 'rejected']) decision!:
    'approved' | 'rejected';
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class ReasonDto {
  @ApiProperty({ example: 'GST certificate does not match legal name' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class KycDocumentResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: KycDocType }) docType!: KycDocType;
  @ApiProperty({ enum: ['pending', 'approved', 'rejected'] }) status!: string;
  @ApiProperty({ type: String, nullable: true }) reviewerNote!: string | null;
  @ApiProperty({ format: 'uuid' }) mediaId!: string;
  @ApiPropertyOptional({ description: 'Short-lived signed URL (admins and the vendor only)' })
  url?: string;
}

export class VendorResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: VendorType }) type!: VendorType;
  @ApiProperty() legalName!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty({ type: String, nullable: true }) cityId!: string | null;
  @ApiProperty({ type: String, nullable: true }) gstin!: string | null;
  @ApiProperty({ type: String, nullable: true }) pan!: string | null;
  @ApiProperty({ enum: VendorStatus }) status!: VendorStatus;
  @ApiProperty({ type: String, nullable: true }) approvedAt!: string | null;
  @ApiProperty({ enum: ['owner', 'staff', 'admin'] }) myRole!: 'owner' | 'staff' | 'admin';
  @ApiProperty({ type: [String] }) myPermissions!: string[];
  @ApiProperty({ type: [KycDocumentResponse] }) kycDocuments!: KycDocumentResponse[];
  @ApiProperty({ type: [String], description: 'Document types still needed before submission' })
  missingDocuments!: string[];
}

export class StaffResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) userId!: string;
  @ApiProperty({ type: String, nullable: true }) displayName!: string | null;
  @ApiProperty({ type: [String] }) permissions!: string[];
  @ApiProperty() isActive!: boolean;
}

export class BankAccountResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() accountHolder!: string;
  @ApiProperty({ example: '9012' }) accountLast4!: string;
  @ApiProperty() ifsc!: string;
  @ApiProperty() isPrimary!: boolean;
  @ApiProperty() isVerified!: boolean;
}
