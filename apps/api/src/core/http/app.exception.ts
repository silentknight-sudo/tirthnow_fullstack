import { HttpException, HttpStatus } from '@nestjs/common';
import { ERROR_CODES, type ErrorCode } from '@tirth-now/shared-types';

/** Throw this from services: carries a stable client-facing error code. */
export class AppException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    status: HttpStatus,
    message: string,
    public readonly details?: unknown,
  ) {
    super({ code, message, details }, status);
  }

  static badRequest(message: string, details?: unknown): AppException {
    return new AppException(ERROR_CODES.BAD_REQUEST, HttpStatus.BAD_REQUEST, message, details);
  }

  static unauthorized(
    code: ErrorCode = ERROR_CODES.AUTH_UNAUTHENTICATED,
    message = 'Authentication required',
  ): AppException {
    return new AppException(code, HttpStatus.UNAUTHORIZED, message);
  }

  static forbidden(
    code: ErrorCode = ERROR_CODES.AUTH_FORBIDDEN,
    message = 'You do not have access to this resource',
  ): AppException {
    return new AppException(code, HttpStatus.FORBIDDEN, message);
  }

  static notFound(message = 'Resource not found'): AppException {
    return new AppException(ERROR_CODES.NOT_FOUND, HttpStatus.NOT_FOUND, message);
  }

  static conflict(message: string, code: ErrorCode = ERROR_CODES.CONFLICT): AppException {
    return new AppException(code, HttpStatus.CONFLICT, message);
  }
}
