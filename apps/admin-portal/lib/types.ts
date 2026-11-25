/**
 * Shapes of admin responses that the OpenAPI document leaves untyped. Keep in
 * step with the admin controllers in apps/api (vendors, safety, moderation,
 * admin). Typed responses come from `Schemas` in @tirth-now/api-client.
 */
export interface Page<T> {
  data: T[];
  nextCursor: string | null;
}

export interface Kpis {
  range: { from: string; to: string };
  users: { total: number; newUsers: number; activeUsers: number; guests: number };
  orders: {
    created: number;
    paid: number;
    cancelled: number;
    gmvPaise: number;
    byType: Record<string, { orders: number; gmvPaise: number }>;
  };
  finance: { revenuePaise: number; gstPaise: number; refundsPaise: number };
  vendors: { byStatus: Record<string, number>; awaitingReview: number };
  sos: { byStatus: Record<string, number>; total: number };
  reels: { reels: number; openReports: number };
  ai: { requests: number; inputTokens: number; outputTokens: number; users: number };
}

export interface KycDoc {
  id: string;
  docType: string;
  mediaId: string;
  status: string;
  reviewerNote: string | null;
  url: string | null;
}

export interface AdminVendor {
  id: string;
  type: string;
  legalName: string;
  displayName: string;
  cityId: string | null;
  gstin: string | null;
  pan: string | null;
  status: string;
  approvedAt: string | null;
  kycDocuments: KycDoc[];
  missingDocuments: string[];
}

export interface AdminUser {
  id: string;
  displayName: string | null;
  email: string | null;
  phoneE164: string | null;
  status: string;
  isGuest: boolean;
  roles: string[];
  createdAt: string;
  lastLoginAt: string | null;
}

export interface SosRow {
  id: string;
  status: string;
  user: { id: string; name: string | null; phoneE164: string | null; email?: string | null } | null;
  lat: number;
  lng: number;
  accuracyM: number | null;
  batteryPct: number | null;
  createdAt: string;
  dispatchedAt: string | null;
  resolvedAt: string | null;
  shareUrl?: string;
  emergencyContacts?: { name: string; phoneE164: string; relation?: string | null }[];
}

export interface ReportRow {
  id: string;
  targetType: string;
  targetId: string;
  reasonCode: string;
  details: string | null;
  automatic: boolean;
  status: string;
  openReportsOnTarget: number;
  target: { exists: boolean; authorId: string | null; summary: Record<string, unknown> };
  createdAt: string;
}

export interface AartiRow {
  id: string;
  templeId: string;
  kind: string;
  nameI18n: { en: string; hi?: string };
  localTime: string;
  durationMin: number | null;
  recurrence: string;
  season: string;
  isLiveStreamed: boolean;
}

export interface ConfigRow {
  id: string;
  key: string;
  value: unknown;
  kind: string;
  isActive: boolean;
  updatedAt: string;
}

export interface AuditRow {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
}

export interface TempleRow {
  id: string;
  slug: string;
  name: string;
  cityId: string;
  crowdLevel: number;
  tags: string[];
}
