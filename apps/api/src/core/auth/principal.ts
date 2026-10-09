import { type Role } from '@tirth-now/shared-types';

/** The authenticated caller, attached to the request by JwtAuthGuard. */
export interface AuthPrincipal {
  userId: string;
  roles: Role[];
  vendorIds: string[];
  sessionId: string;
  isGuest: boolean;
}

export type RequestWithPrincipal = {
  user?: AuthPrincipal;
  id?: string;
  ip?: string;
  headers: Record<string, unknown>;
};
