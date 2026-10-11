import { SetMetadata } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';

export const IDEMPOTENT_KEY = 'idempotency:scope';

/**
 * Require an `Idempotency-Key` header. A repeated key with the same body replays the stored
 * response; with a different body it is rejected (422); while the first request is still
 * running it is rejected (409). Keys live 24 h, scoped per user and per `scope`.
 */
export function Idempotent(scope: string): MethodDecorator {
  return (target, key, descriptor) => {
    SetMetadata(IDEMPOTENT_KEY, scope)(target, key, descriptor);
    ApiHeader({
      name: 'Idempotency-Key',
      required: true,
      description: '8–128 chars, unique per logical request',
    })(target, key, descriptor);
  };
}
