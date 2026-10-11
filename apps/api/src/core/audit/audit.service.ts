import { Injectable, Logger } from '@nestjs/common';
import { type Prisma } from '@prisma/client';
import { type AuthPrincipal } from '../auth/principal';
import { PrismaService } from '../prisma';

export interface AuditEntry {
  actor: AuthPrincipal | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | undefined;
  requestId?: string | undefined;
}

type Db = PrismaService | Prisma.TransactionClient;

const toJson = (v: unknown): Prisma.InputJsonValue | undefined =>
  v === undefined || v === null
    ? undefined
    : (JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue);

/**
 * Writes the append-only audit_logs table. Every admin action and every vendor action that
 * changes money, inventory or listings records an entry (read by the admin module).
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry, db: Db = this.prisma): Promise<void> {
    const actorRole =
      entry.actor?.roles.find((r) => r !== 'user') ?? entry.actor?.roles[0] ?? 'system';
    await db.auditLog.create({
      data: {
        actorId: entry.actor?.userId ?? null,
        actorRole,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        before: toJson(entry.before),
        after: toJson(entry.after),
        ip: entry.ip ?? null,
        requestId: entry.requestId ?? null,
      },
    });
    this.logger.log(
      { action: entry.action, entityType: entry.entityType, entityId: entry.entityId },
      'audit',
    );
  }
}
