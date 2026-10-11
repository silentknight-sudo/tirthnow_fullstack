export const VENDOR_EVENTS = {
  submitted: 'vendor.submitted',
  approved: 'vendor.approved',
  rejected: 'vendor.rejected',
  suspended: 'vendor.suspended',
  reinstated: 'vendor.reinstated',
} as const;

export interface VendorStatusEvent {
  vendorId: string;
  ownerUserId: string;
  reason?: string;
}
