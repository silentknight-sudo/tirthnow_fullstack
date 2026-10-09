import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { type ApiErrorBody, ERROR_CODES, type ErrorCode } from '@tirth-now/shared-types';
import { type Request, type Response } from 'express';
import { AppException } from './app.exception';

const STATUS_CODES: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ERROR_CODES.BAD_REQUEST,
  [HttpStatus.UNAUTHORIZED]: ERROR_CODES.AUTH_UNAUTHENTICATED,
  [HttpStatus.FORBIDDEN]: ERROR_CODES.AUTH_FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ERROR_CODES.NOT_FOUND,
  [HttpStatus.CONFLICT]: ERROR_CODES.CONFLICT,
  [HttpStatus.TOO_MANY_REQUESTS]: ERROR_CODES.RATE_LIMITED,
  [HttpStatus.SERVICE_UNAVAILABLE]: ERROR_CODES.SERVICE_UNAVAILABLE,
};

const TOO_MANY_REQUESTS: number = HttpStatus.TOO_MANY_REQUESTS;

interface Normalized {
  status: number;
  code: ErrorCode;
  message: string;
  details?: unknown;
}

function messageOf(response: unknown, fallback: string): string {
  if (typeof response === 'string') return response;
  if (typeof response === 'object' && response !== null && 'message' in response) {
    const m = response.message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m)) return m.filter((x) => typeof x === 'string').join('; ');
  }
  return fallback;
}

export function normalizeException(exception: unknown): Normalized {
  if (exception instanceof AppException) {
    return {
      status: exception.getStatus(),
      code: exception.code,
      message: messageOf(exception.getResponse(), exception.message),
      details: exception.details,
    };
  }
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    return {
      status,
      code:
        STATUS_CODES[status] ?? (status >= 500 ? ERROR_CODES.INTERNAL : ERROR_CODES.BAD_REQUEST),
      message:
        status === TOO_MANY_REQUESTS
          ? 'Too many requests, please slow down'
          : messageOf(exception.getResponse(), exception.message),
    };
  }
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    if (exception.code === 'P2002') {
      return {
        status: HttpStatus.CONFLICT,
        code: ERROR_CODES.CONFLICT,
        message: 'Resource already exists',
      };
    }
    if (exception.code === 'P2025') {
      return {
        status: HttpStatus.NOT_FOUND,
        code: ERROR_CODES.NOT_FOUND,
        message: 'Resource not found',
      };
    }
  }
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    code: ERROR_CODES.INTERNAL,
    message: 'Something went wrong',
  };
}

/** Every error leaves the API as { error: { code, message, details?, requestId } }. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const rawId: unknown = req.id;
    const requestId =
      typeof rawId === 'string' || typeof rawId === 'number' ? String(rawId) : undefined;
    const res = http.getResponse<Response>();
    const n = normalizeException(exception);

    if (n.status >= 500) {
      // Sentry capture hooks in here (Phase 6).
      this.logger.error(
        { err: exception, requestId, path: req.url },
        exception instanceof Error ? exception.message : 'Unhandled exception',
      );
    }

    const body: ApiErrorBody = {
      error: {
        code: n.code,
        message: n.message,
        ...(n.details === undefined ? {} : { details: n.details }),
        ...(requestId === undefined ? {} : { requestId }),
      },
    };
    res.status(n.status).json(body);
  }
}
