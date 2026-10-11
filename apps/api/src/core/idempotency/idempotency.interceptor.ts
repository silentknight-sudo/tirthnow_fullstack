import { createHash } from 'node:crypto';
import {
  type CallHandler,
  type ExecutionContext,
  HttpStatus,
  Injectable,
  type NestInterceptor,
  RequestMethod,
} from '@nestjs/common';
import { HTTP_CODE_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { ERROR_CODES } from '@tirth-now/shared-types';
import { type Request, type Response } from 'express';
import { from, lastValueFrom, type Observable } from 'rxjs';
import { type AuthPrincipal } from '../auth/principal';
import { AppException } from '../http/app.exception';
import { PrismaService } from '../prisma';
import { IDEMPOTENT_KEY } from './idempotent.decorator';

const TTL_MS = 24 * 3600_000;
const KEY_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
  }
  // JSON.stringify returns undefined for undefined/functions despite its declared type.
  const out = JSON.stringify(value) as string | undefined;
  return out ?? 'null';
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const scope = this.reflector.get<string | undefined>(IDEMPOTENT_KEY, ctx.getHandler());
    if (!scope || ctx.getType() !== 'http') return next.handle();
    return from(this.handle(scope, ctx, next));
  }

  private async handle(scope: string, ctx: ExecutionContext, next: CallHandler): Promise<unknown> {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthPrincipal }>();
    const res = ctx.switchToHttp().getResponse<Response>();
    const header = req.get('idempotency-key');
    if (!header || !KEY_PATTERN.test(header)) {
      throw new AppException(
        ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED,
        HttpStatus.BAD_REQUEST,
        'Idempotency-Key header (8-128 chars of A-Z a-z 0-9 . _ : -) is required',
      );
    }
    const userId = req.user?.userId;
    if (!userId) throw AppException.unauthorized();

    const requestHash = createHash('sha256')
      .update(`${req.method} ${req.originalUrl}\n${stableStringify(req.body)}`)
      .digest('hex');
    const where = { scope_userId_key: { scope, userId, key: header } };

    try {
      await this.prisma.idempotencyKey.create({
        data: { scope, userId, key: header, requestHash, expiresAt: new Date(Date.now() + TTL_MS) },
      });
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') throw err;
      const existing = await this.prisma.idempotencyKey.findUnique({ where });
      if (!existing || existing.expiresAt.getTime() < Date.now()) {
        // Expired entry: replace it and run the request again.
        await this.prisma.idempotencyKey.deleteMany({ where: { scope, userId, key: header } });
        return this.handle(scope, ctx, next);
      }
      if (existing.requestHash !== requestHash) {
        throw new AppException(
          ERROR_CODES.IDEMPOTENCY_KEY_MISMATCH,
          HttpStatus.UNPROCESSABLE_ENTITY,
          'This Idempotency-Key was already used with a different request',
        );
      }
      if (existing.responseStatus === null) {
        throw new AppException(
          ERROR_CODES.IDEMPOTENCY_IN_PROGRESS,
          HttpStatus.CONFLICT,
          'A request with this Idempotency-Key is still being processed',
        );
      }
      res.status(existing.responseStatus);
      res.setHeader('Idempotent-Replay', 'true');
      return existing.responseBody;
    }

    try {
      const body: unknown = await lastValueFrom(next.handle(), { defaultValue: undefined });
      const status = this.statusFor(ctx);
      await this.prisma.idempotencyKey.update({
        where,
        data: {
          responseStatus: status,
          responseBody:
            body === undefined
              ? Prisma.JsonNull
              : (JSON.parse(JSON.stringify(body)) as Prisma.InputJsonValue),
        },
      });
      return body;
    } catch (err) {
      // Failed requests do not consume the key; the client may retry with it.
      await this.prisma.idempotencyKey.deleteMany({ where: { scope, userId, key: header } });
      throw err;
    }
  }

  private statusFor(ctx: ExecutionContext): number {
    const explicit = this.reflector.get<number | undefined>(HTTP_CODE_METADATA, ctx.getHandler());
    if (explicit !== undefined) return explicit;
    const method = this.reflector.get<RequestMethod | undefined>(METHOD_METADATA, ctx.getHandler());
    return method === RequestMethod.POST ? HttpStatus.CREATED : HttpStatus.OK;
  }
}
