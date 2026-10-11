import { type KycDocType, type VendorType } from '@prisma/client';

/** Documents needed before a vendor can submit for review. */
export function requiredDocuments(type: VendorType, hasGstin: boolean): KycDocType[] {
  const docs = new Set<KycDocType>(['pan']);
  if (hasGstin) docs.add('gst');
  if (type === 'hotel') docs.add('trade_license');
  if (type === 'restaurant') docs.add('fssai');
  if (type === 'cab') {
    docs.add('rc');
    docs.add('permit');
  }
  return [...docs];
}

export function missingDocuments(
  type: VendorType,
  hasGstin: boolean,
  docs: { docType: KycDocType; status: string }[],
): KycDocType[] {
  const present = new Set(docs.filter((d) => d.status !== 'rejected').map((d) => d.docType));
  return requiredDocuments(type, hasGstin).filter((d) => !present.has(d));
}
