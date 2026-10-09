import { HttpStatus, ValidationPipe, type ValidationError } from '@nestjs/common';
import { ERROR_CODES } from '@tirth-now/shared-types';
import { AppException } from './app.exception';

export interface FieldError {
  field: string;
  errors: string[];
}

export function flattenValidationErrors(errors: ValidationError[], parent = ''): FieldError[] {
  return errors.flatMap((e) => {
    const field = parent ? `${parent}.${e.property}` : e.property;
    const own = e.constraints ? [{ field, errors: Object.values(e.constraints) }] : [];
    return [...own, ...flattenValidationErrors(e.children ?? [], field)];
  });
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    stopAtFirstError: false,
    exceptionFactory: (errors) =>
      new AppException(
        ERROR_CODES.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
        'Request validation failed',
        flattenValidationErrors(errors),
      ),
  });
}
