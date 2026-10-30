import type { Tone } from '../components/ui';

export const orderTone: Record<string, Tone> = {
  pending: 'orange',
  confirmed: 'blue',
  in_progress: 'blue',
  completed: 'green',
  cancelled: 'gray',
  refunded: 'gray',
};

export const vendorTone: Record<string, Tone> = {
  draft: 'gray',
  kyc_pending: 'orange',
  kyc_rejected: 'red',
  active: 'green',
  suspended: 'red',
};

export const vendorStatusLabel: Record<string, string> = {
  draft: 'Draft — finish onboarding',
  kyc_pending: 'Under review',
  kyc_rejected: 'Changes needed',
  active: 'Live',
  suspended: 'Suspended',
};
