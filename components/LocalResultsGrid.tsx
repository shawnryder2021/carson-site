'use client';

import { VehicleCard } from './VehicleCard';
import type { Vehicle } from '@/data/inventory';

// Vehicle grid for the server-rendered local search pages (/used/[slug]).
export function LocalResultsGrid({ vehicles }: { vehicles: Vehicle[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
      {vehicles.map(v => <VehicleCard key={v.id} vehicle={v} />)}
    </div>
  );
}
