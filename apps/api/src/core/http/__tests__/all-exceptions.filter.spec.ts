import { BadRequestException, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Prisma } from '@prisma/client';
import { ERROR_CODES } from '@tirth-now/shared-types';
import { normalizeException } from '../all-exceptions.filter';
import { AppException } from '../app.exception';

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('db error', { code, clientVersion: 'test' });

describe('normalizeException', () => {
  it('keeps AppException code, message and details', () => {
    const n = normalizeException(
      new AppException(ERROR_CODES.VALIDATION_FAILED, HttpStatus.BAD_REQUEST, 'bad', [
        { field: 'x' },
      ]),
    );
    expect(n).toEqual({
      status: 400,
      code: 'VALIDATION_FAILED',
      message: 'bad',
      details: [{ field: 'x' }],
    });
  });

  it('maps framework HttpExceptions by status', () => {
    expect(normalizeException(new NotFoundException('nope'))).toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      message: 'nope',
    });
    expect(normalizeException(new BadRequestException(['a', 'b']))).toMatchObject({
      status: 400,
      message: 'a; b',
    });
    expect(normalizeException(new HttpException('teapot', 418))).toMatchObject({
      status: 418,
      code: 'BAD_REQUEST',
    });
  });

  it('maps throttling to RATE_LIMITED', () => {
    expect(normalizeException(new ThrottlerException())).toMatchObject({
      status: 429,
      code: 'RATE_LIMITED',
    });
  });

  it('maps Prisma unique and not-found errors', () => {
    expect(normalizeException(prismaError('P2002'))).toMatchObject({
      status: 409,
      code: 'CONFLICT',
    });
    expect(normalizeException(prismaError('P2025'))).toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  it('hides unknown errors behind INTERNAL', () => {
    const n = normalizeException(new Error('secret stack detail'));
    expect(n).toEqual({ status: 500, code: 'INTERNAL', message: 'Something went wrong' });
    expect(normalizeException(prismaError('P1001')).code).toBe('INTERNAL');
  });
});
