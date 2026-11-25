import type { Tone } from '../components/ui';

/** Badge colour for any status the panel shows. */
export function tone(status: string): Tone {
  switch (status) {
    case 'active':
    case 'approved':
    case 'completed':
    case 'paid':
    case 'resolved':
    case 'actioned':
    case 'confirmed':
      return 'green';
    case 'kyc_pending':
    case 'pending':
    case 'pending_approval':
    case 'open':
    case 'in_progress':
    case 'processing':
    case 'dispatched':
      return 'orange';
    case 'kyc_rejected':
    case 'rejected':
    case 'suspended':
    case 'failed':
    case 'cancelled':
    case 'triggered':
    case 'on_hold':
      return 'red';
    case 'refunded':
    case 'draft':
      return 'blue';
    default:
      return 'gray';
  }
}
