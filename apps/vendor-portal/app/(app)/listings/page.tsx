'use client';

import { CabsSection } from '../../../components/listings/cabs';
import { ExperiencesSection } from '../../../components/listings/experiences';
import { FoodSection } from '../../../components/listings/food';
import { HotelsSection } from '../../../components/listings/hotels';
import { PageHeader } from '../../../components/ui';
import { useVendor } from '../../../lib/session';

export default function ListingsPage() {
  const { vendor, vid, can } = useVendor();
  const t = vendor.type;
  const all = t === 'multi';
  const edit = can('listings.edit');
  return (
    <>
      <PageHeader
        title="Listings"
        subtitle="What pilgrims can book. Listings go live once your business is approved and the listing is published."
      />
      <div className="space-y-10">
        {(all || t === 'hotel') && <HotelsSection vid={vid} canEdit={edit} />}
        {(all || t === 'cab') && <CabsSection vid={vid} canEdit={edit} />}
        {(all || t === 'restaurant') && <FoodSection vid={vid} canEdit={edit} />}
        {(all || t === 'experience') && (
          <ExperiencesSection vid={vid} canEdit={edit} canInventory={can('inventory.edit')} />
        )}
      </div>
    </>
  );
}
