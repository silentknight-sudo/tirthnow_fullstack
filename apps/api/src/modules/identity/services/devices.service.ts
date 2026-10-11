import { Injectable } from '@nestjs/common';
import { type Prisma } from '@prisma/client';
import { AppException } from '../../../core/http';
import { PrismaService } from '../../../core/prisma';
import { type DeviceResponse, type RegisterDeviceDto } from '../dto/me.dto';

type Db = PrismaService | Prisma.TransactionClient;
type DeviceInput = Pick<
  RegisterDeviceDto,
  'deviceId' | 'platform' | 'fcmToken' | 'appVersion' | 'locale'
>;

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Register or refresh a device; returns its id. */
  async upsert(tx: Db, userId: string, d: DeviceInput): Promise<string> {
    const fields = {
      platform: d.platform,
      appVersion: d.appVersion ?? null,
      locale: d.locale ?? null,
      lastSeenAt: new Date(),
    };
    if (d.deviceId) {
      const own = await tx.device.findFirst({ where: { id: d.deviceId, userId } });
      if (own) {
        if (d.fcmToken && d.fcmToken !== own.fcmToken) {
          // An FCM token identifies one app install; detach it from any other device row.
          await tx.device.updateMany({
            where: { fcmToken: d.fcmToken, NOT: { id: own.id } },
            data: { fcmToken: null },
          });
        }
        await tx.device.update({
          where: { id: own.id },
          data: { ...fields, ...(d.fcmToken ? { fcmToken: d.fcmToken } : {}) },
        });
        return own.id;
      }
    }
    if (d.fcmToken) {
      // Shared phones: the token moves to whoever signed in last.
      const device = await tx.device.upsert({
        where: { fcmToken: d.fcmToken },
        create: { userId, fcmToken: d.fcmToken, ...fields },
        update: { userId, ...fields },
      });
      return device.id;
    }
    const device = await tx.device.create({ data: { userId, ...fields } });
    return device.id;
  }

  async register(userId: string, dto: RegisterDeviceDto): Promise<DeviceResponse> {
    const id = await this.prisma.$transaction((tx) => this.upsert(tx, userId, dto));
    const device = await this.prisma.device.findUniqueOrThrow({ where: { id } });
    return this.toResponse(device);
  }

  async list(userId: string): Promise<DeviceResponse[]> {
    const rows = await this.prisma.device.findMany({
      where: { userId },
      orderBy: { lastSeenAt: 'desc' },
    });
    return rows.map((d) => this.toResponse(d));
  }

  async remove(userId: string, deviceId: string): Promise<void> {
    const res = await this.prisma.device.deleteMany({ where: { id: deviceId, userId } });
    if (res.count === 0) throw AppException.notFound('Device not found');
  }

  /** FCM tokens for push, newest device first. */
  async pushTokens(
    userIds: string[],
  ): Promise<{ userId: string; deviceId: string; token: string }[]> {
    if (userIds.length === 0) return [];
    const rows = await this.prisma.device.findMany({
      where: { userId: { in: userIds }, fcmToken: { not: null } },
      orderBy: { lastSeenAt: 'desc' },
    });
    return rows.flatMap((d) =>
      d.fcmToken ? [{ userId: d.userId, deviceId: d.id, token: d.fcmToken }] : [],
    );
  }

  /** Called when FCM reports a token as unregistered. */
  async forgetToken(token: string): Promise<void> {
    await this.prisma.device.updateMany({ where: { fcmToken: token }, data: { fcmToken: null } });
  }

  private toResponse(d: {
    id: string;
    platform: DeviceResponse['platform'];
    fcmToken: string | null;
    appVersion: string | null;
    lastSeenAt: Date;
  }): DeviceResponse {
    return {
      id: d.id,
      platform: d.platform,
      hasPushToken: d.fcmToken !== null,
      appVersion: d.appVersion,
      lastSeenAt: d.lastSeenAt.toISOString(),
    };
  }
}
