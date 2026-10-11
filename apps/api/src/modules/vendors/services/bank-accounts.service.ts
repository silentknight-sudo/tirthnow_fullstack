import { Inject, Injectable } from '@nestjs/common';
import { type VendorBankAccount } from '@prisma/client';
import { AuditService } from '../../../core/audit';
import { type AuthPrincipal } from '../../../core/auth';
import { APP_CONFIG, type AppConfig } from '../../../core/config';
import { decryptField, encryptField } from '../../../core/crypto';
import { AppException } from '../../../core/http';
import { PrismaService } from '../../../core/prisma';
import { type AddBankAccountDto, type BankAccountResponse } from '../dto/vendors.dto';

export interface DecryptedBankAccount {
  id: string;
  accountHolder: string;
  accountNumber: string;
  ifsc: string;
}

@Injectable()
export class BankAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async list(vendorId: string): Promise<BankAccountResponse[]> {
    const rows = await this.prisma.vendorBankAccount.findMany({
      where: { vendorId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
    return rows.map(toResponse);
  }

  async add(
    actor: AuthPrincipal,
    vendorId: string,
    dto: AddBankAccountDto,
  ): Promise<BankAccountResponse> {
    const row = await this.prisma.$transaction(async (tx) => {
      const count = await tx.vendorBankAccount.count({ where: { vendorId } });
      if (count >= 5) throw AppException.conflict('A vendor can have at most 5 bank accounts');
      return tx.vendorBankAccount.create({
        data: {
          vendorId,
          accountHolder: dto.accountHolder,
          accountNumberEnc: encryptField(dto.accountNumber, this.config.dataEncryptionKey),
          accountLast4: dto.accountNumber.slice(-4),
          ifsc: dto.ifsc,
          isPrimary: count === 0,
        },
      });
    });
    await this.audit.record({
      actor,
      action: 'vendor.bank_add',
      entityType: 'vendor',
      entityId: vendorId,
      after: toResponse(row),
    });
    return toResponse(row);
  }

  async makePrimary(
    actor: AuthPrincipal,
    vendorId: string,
    accountId: string,
  ): Promise<BankAccountResponse[]> {
    await this.prisma.$transaction(async (tx) => {
      const acc = await tx.vendorBankAccount.findFirst({ where: { id: accountId, vendorId } });
      if (!acc) throw AppException.notFound('Bank account not found');
      await tx.vendorBankAccount.updateMany({ where: { vendorId }, data: { isPrimary: false } });
      await tx.vendorBankAccount.update({ where: { id: accountId }, data: { isPrimary: true } });
    });
    await this.audit.record({
      actor,
      action: 'vendor.bank_primary',
      entityType: 'vendor',
      entityId: vendorId,
      after: { accountId },
    });
    return this.list(vendorId);
  }

  /** Full account number, for payouts only. */
  async primaryDecrypted(vendorId: string): Promise<DecryptedBankAccount | null> {
    const acc = await this.prisma.vendorBankAccount.findFirst({
      where: { vendorId, isPrimary: true },
    });
    if (!acc) return null;
    return {
      id: acc.id,
      accountHolder: acc.accountHolder,
      accountNumber: decryptField(acc.accountNumberEnc, this.config.dataEncryptionKey),
      ifsc: acc.ifsc,
    };
  }

  async markVerified(accountId: string): Promise<void> {
    await this.prisma.vendorBankAccount.update({
      where: { id: accountId },
      data: { isVerified: true },
    });
  }
}

function toResponse(a: VendorBankAccount): BankAccountResponse {
  return {
    id: a.id,
    accountHolder: a.accountHolder,
    accountLast4: a.accountLast4,
    ifsc: a.ifsc,
    isPrimary: a.isPrimary,
    isVerified: a.isVerified,
  };
}
