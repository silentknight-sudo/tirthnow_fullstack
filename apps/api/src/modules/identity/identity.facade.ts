import { Injectable } from '@nestjs/common';
import { type AuthUser } from '@tirth-now/shared-types';
import { AuthService } from './services/auth.service';

/** Public surface of the identity module for other modules (ADR-0001). */
@Injectable()
export class IdentityFacade {
  constructor(private readonly auth: AuthService) {}

  getAuthUser(userId: string): Promise<AuthUser> {
    return this.auth.me(userId);
  }
}
