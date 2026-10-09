import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '../auth';
import { MockEmailAdapter, type OutboxEntry } from '../providers';

/** Non-production helpers. Registered only when NODE_ENV !== production. */
@ApiExcludeController()
@Public()
@Controller('dev')
export class DevController {
  constructor(private readonly mockEmail: MockEmailAdapter) {}

  /** Messages captured by mock providers (EMAIL_PROVIDER=mock). */
  @Get('outbox')
  outbox(): { email: OutboxEntry[] } {
    return { email: this.mockEmail.outbox };
  }
}
