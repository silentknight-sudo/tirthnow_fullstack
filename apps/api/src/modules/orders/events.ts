import { type OrderStatus, type OrderType } from '@prisma/client';

export const ORDER_EVENTS = {
  created: 'order.created',
  confirmed: 'order.confirmed',
  in_progress: 'order.in_progress',
  completed: 'order.completed',
  cancelled: 'order.cancelled',
  refunded: 'order.refunded',
  accepted: 'order.accepted',
  pending: 'order.pending',
} as const satisfies Partial<Record<OrderStatus | 'created' | 'accepted', string>>;

export interface OrderEvent {
  orderId: string;
  code: string;
  type: OrderType;
  userId: string;
  vendorId: string | null;
  from: OrderStatus | null;
  status: OrderStatus;
  actorType: string;
  reason: string | null;
}
