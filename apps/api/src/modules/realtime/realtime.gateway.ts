import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { type Lang } from '@tirth-now/shared-types';
import { type Namespace, type Socket } from 'socket.io';
import { type AuthPrincipal, principalFromToken } from '../../core/auth';
import { CatalogFacade } from '../catalog';
import { RT_NAMESPACE } from './realtime.publisher';
import { RoomAccessService } from './room-access.service';
import { parseRoom } from './rooms';

export interface SubscribeAck {
  ok: boolean;
  room?: string;
  error?: 'INVALID_ROOM' | 'FORBIDDEN';
}

const roomOf = (body: unknown): unknown =>
  typeof body === 'object' && body !== null ? (body as Record<string, unknown>).room : undefined;

/**
 * Socket.IO at /rt. Connect with `auth: { token: <access JWT> }` (anonymous clients may only
 * follow aarti countdowns and shared SOS links), then emit `subscribe { room }`.
 */
@WebSocketGateway({ namespace: RT_NAMESPACE })
export class RealtimeGateway implements OnGatewayInit {
  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly users = new WeakMap<Socket, AuthPrincipal>();

  constructor(
    private readonly jwt: JwtService,
    private readonly access: RoomAccessService,
    private readonly catalog: CatalogFacade,
  ) {}

  afterInit(nsp: Namespace): void {
    // Authenticate in middleware so no message is handled before we know who is connected.
    nsp.use((socket, next) => {
      const auth = socket.handshake.auth as Record<string, unknown> | undefined;
      const token = auth?.token;
      if (typeof token !== 'string' || token === '') {
        next();
        return;
      }
      void principalFromToken(this.jwt, token).then((principal) => {
        if (!principal) {
          next(new Error('AUTH_UNAUTHENTICATED'));
          return;
        }
        this.users.set(socket, principal);
        next();
      });
    });
  }

  @SubscribeMessage('subscribe')
  async subscribe(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<SubscribeAck> {
    const name = roomOf(body);
    const room = parseRoom(name);
    if (!room || typeof name !== 'string') return { ok: false, error: 'INVALID_ROOM' };
    const user = this.users.get(socket) ?? null;
    if (!(await this.access.canJoin(user, room))) {
      this.logger.debug({ room: name, userId: user?.userId }, 'realtime subscribe denied');
      return { ok: false, error: 'FORBIDDEN' };
    }
    await socket.join(name);
    if (room.kind === 'aarti') {
      // Countdown seed: the client ticks locally from `startsAt` (ARCHITECTURE.md §9).
      const lang: Lang = socket.handshake.query.lang === 'hi' ? 'hi' : 'en';
      socket.emit('aarti.countdown', {
        templeId: room.id,
        next: await this.catalog.nextAarti(room.id, lang),
      });
    }
    return { ok: true, room: name };
  }

  @SubscribeMessage('unsubscribe')
  async unsubscribe(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<SubscribeAck> {
    const name = roomOf(body);
    if (typeof name !== 'string' || !parseRoom(name)) return { ok: false, error: 'INVALID_ROOM' };
    await socket.leave(name);
    return { ok: true, room: name };
  }
}
