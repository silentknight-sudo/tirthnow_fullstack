import { Injectable } from '@nestjs/common';
import { type Prisma, type RoleKey } from '@prisma/client';
import { type AuthUser, type Role } from '@tirth-now/shared-types';
import { PrismaService } from '../../../core/prisma';

type Db = PrismaService | Prisma.TransactionClient;

const AUTH_USER_INCLUDE = {
  profile: { select: { displayName: true } },
  roles: { select: { vendorId: true, role: { select: { key: true } } } },
} satisfies Prisma.UserInclude;

type UserWithRoles = Prisma.UserGetPayload<{ include: typeof AUTH_USER_INCLUDE }>;

export function toAuthUser(user: UserWithRoles): AuthUser {
  const roles = [...new Set(user.roles.map((r): Role => r.role.key))].sort();
  const vendorIds = [
    ...new Set(user.roles.flatMap((r) => (r.vendorId ? [r.vendorId] : []))),
  ].sort();
  return {
    id: user.id,
    email: user.email,
    phoneE164: user.phoneE164,
    displayName: user.profile?.displayName ?? null,
    isGuest: user.isGuest,
    roles,
    vendorIds,
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findWithRoles(
    userId: string,
    db: Db = this.prisma,
  ): Promise<(UserWithRoles & { auth: AuthUser }) | null> {
    const user = await db.user.findUnique({ where: { id: userId }, include: AUTH_USER_INCLUDE });
    return user ? { ...user, auth: toAuthUser(user) } : null;
  }

  async findByEmailWithRoles(email: string): Promise<(UserWithRoles & { auth: AuthUser }) | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: AUTH_USER_INCLUDE,
    });
    return user ? { ...user, auth: toAuthUser(user) } : null;
  }

  async grantRole(
    db: Db,
    userId: string,
    key: RoleKey,
    vendorId: string | null = null,
  ): Promise<void> {
    const role = await db.role.findUniqueOrThrow({ where: { key } });
    const existing = await db.userRole.findFirst({ where: { userId, roleId: role.id, vendorId } });
    if (!existing) await db.userRole.create({ data: { userId, roleId: role.id, vendorId } });
  }
}
