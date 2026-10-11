import { Injectable } from '@nestjs/common';
import { type AuthPrincipal, hasAnyRole } from '../../core/auth';
import { CatalogFacade } from '../catalog';
import { OrdersFacade } from '../orders';
import { SafetyFacade } from '../safety';
import { VendorsFacade } from '../vendors';
import { type Room } from './rooms';

/** Who may join which room (ARCHITECTURE.md §9). Checked on every subscribe. */
@Injectable()
export class RoomAccessService {
  constructor(
    private readonly catalog: CatalogFacade,
    private readonly orders: OrdersFacade,
    private readonly vendors: VendorsFacade,
    private readonly safety: SafetyFacade,
  ) {}

  async canJoin(user: AuthPrincipal | null, room: Room): Promise<boolean> {
    switch (room.kind) {
      case 'aarti':
        return this.catalog.templeExists(room.id);
      case 'sos':
        return this.safety.isShareActive(room.id);
      case 'admin':
        return !!user && hasAnyRole(user.roles, ['admin']);
      case 'vendor':
        return !!user && (await this.vendorMember(user, room.id));
      case 'order': {
        if (!user) return false;
        const order = await this.orders.get(room.id);
        if (!order) return false;
        if (order.userId === user.userId || hasAnyRole(user.roles, ['admin'])) return true;
        return order.vendorId !== null && (await this.vendorMember(user, order.vendorId));
      }
    }
  }

  private async vendorMember(user: AuthPrincipal, vendorId: string): Promise<boolean> {
    try {
      await this.vendors.requireAccess(user, vendorId, 'orders.manage');
      return true;
    } catch {
      return false;
    }
  }
}
