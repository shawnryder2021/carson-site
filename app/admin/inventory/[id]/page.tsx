'use client';

import { useEffect, useState } from 'react';
import { VehicleForm } from '@/components/admin/VehicleForm';
import { getVehicleById, AdminVehicle } from '@/lib/db';

export default function EditVehiclePage({ params }: { params: { id: string } }) {
  const [vehicle, setVehicle] = useState<AdminVehicle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setVehicle(await getVehicleById(params.id));
      setLoading(false);
    })();
  }, [params.id]);

  if (loading) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading…</div>;
  if (!vehicle) return <div style={{ padding: 40 }}>Vehicle not found.</div>;
  return <VehicleForm initial={vehicle} isNew={false} />;
}
