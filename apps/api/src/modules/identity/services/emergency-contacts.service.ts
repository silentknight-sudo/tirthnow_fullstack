import { Injectable } from '@nestjs/common';
import { type EmergencyContact } from '@prisma/client';
import { AppException } from '../../../core/http';
import { PrismaService } from '../../../core/prisma';
import {
  type EmergencyContactDto,
  type EmergencyContactResponse,
  type UpdateEmergencyContactDto,
} from '../dto/me.dto';

export const MAX_EMERGENCY_CONTACTS = 5;

@Injectable()
export class EmergencyContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<EmergencyContactResponse[]> {
    const rows = await this.prisma.emergencyContact.findMany({
      where: { userId },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
    return rows.map(toResponse);
  }

  async create(userId: string, dto: EmergencyContactDto): Promise<EmergencyContactResponse> {
    return this.prisma.$transaction(async (tx) => {
      // Lock the user's row so two concurrent adds cannot exceed the limit.
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      const count = await tx.emergencyContact.count({ where: { userId } });
      if (count >= MAX_EMERGENCY_CONTACTS) {
        throw AppException.conflict(
          `You can save up to ${MAX_EMERGENCY_CONTACTS} emergency contacts`,
        );
      }
      const duplicate = await tx.emergencyContact.findFirst({
        where: { userId, phoneE164: dto.phoneE164 },
      });
      if (duplicate) throw AppException.conflict('This number is already an emergency contact');
      const row = await tx.emergencyContact.create({
        data: {
          userId,
          name: dto.name,
          phoneE164: dto.phoneE164,
          relation: dto.relation ?? null,
          notifyWhatsapp: dto.notifyWhatsapp ?? true,
          priority: dto.priority ?? 0,
        },
      });
      return toResponse(row);
    });
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateEmergencyContactDto,
  ): Promise<EmergencyContactResponse> {
    const existing = await this.prisma.emergencyContact.findFirst({ where: { id, userId } });
    if (!existing) throw AppException.notFound('Contact not found');
    const row = await this.prisma.emergencyContact.update({ where: { id }, data: dto });
    return toResponse(row);
  }

  async remove(userId: string, id: string): Promise<void> {
    const res = await this.prisma.emergencyContact.deleteMany({ where: { id, userId } });
    if (res.count === 0) throw AppException.notFound('Contact not found');
  }
}

function toResponse(c: EmergencyContact): EmergencyContactResponse {
  return {
    id: c.id,
    name: c.name,
    phoneE164: c.phoneE164,
    relation: c.relation,
    notifyWhatsapp: c.notifyWhatsapp,
    priority: c.priority,
  };
}
