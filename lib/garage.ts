// Customer "My Garage" data helpers — everything a signed-in shopper owns:
// saved vehicles, price-drop watches, submitted leads, and CarFinder alerts.
// All queries filter explicitly by the signed-in user's id (RLS enforces it
// anyway, but the explicit filter keeps an admin's garage showing only THEIR
// rows). Null-safe when Supabase isn't configured.
import { getBrowserClient } from './supabase/client';
import type { CarRequest } from './carMatch';
import type { Lead, VehicleWatch } from './db';

async function uid(sb: NonNullable<ReturnType<typeof getBrowserClient>>): Promise<string | null> {
  const { data } = await sb.auth.getSession();
  return data.session?.user.id ?? null;
}

// ── Saved vehicles ──

export async function listMySavedVehicleIds(): Promise<string[]> {
  const sb = getBrowserClient();
  if (!sb) return [];
  const id = await uid(sb);
  if (!id) return [];
  const { data, error } = await sb.from('saved_vehicles').select('vehicle_id').eq('user_id', id);
  if (error || !data) return [];
  return data.map((r: any) => r.vehicle_id);
}

export async function addSavedVehicle(vehicleId: string): Promise<void> {
  const sb = getBrowserClient();
  if (!sb) return;
  const id = await uid(sb);
  if (!id) return;
  await sb.from('saved_vehicles').upsert(
    { user_id: id, vehicle_id: vehicleId },
    { onConflict: 'user_id,vehicle_id', ignoreDuplicates: true },
  );
}

export async function removeSavedVehicle(vehicleId: string): Promise<void> {
  const sb = getBrowserClient();
  if (!sb) return;
  const id = await uid(sb);
  if (!id) return;
  await sb.from('saved_vehicles').delete().eq('user_id', id).eq('vehicle_id', vehicleId);
}

// Merge a device's localStorage shortlist into the account. Row-by-row so a
// stale id that fails the vehicles FK doesn't abort the rest.
export async function mergeSavedVehicles(vehicleIds: string[]): Promise<void> {
  const sb = getBrowserClient();
  if (!sb || vehicleIds.length === 0) return;
  const id = await uid(sb);
  if (!id) return;
  for (const vehicleId of vehicleIds) {
    try {
      await sb.from('saved_vehicles').upsert(
        { user_id: id, vehicle_id: vehicleId },
        { onConflict: 'user_id,vehicle_id', ignoreDuplicates: true },
      );
    } catch { /* stale vehicle id — skip */ }
  }
}

// ── Price-drop watches ──

export async function listMyWatches(): Promise<VehicleWatch[]> {
  const sb = getBrowserClient();
  if (!sb) return [];
  const id = await uid(sb);
  if (!id) return [];
  const { data, error } = await sb.from('vehicle_watches')
    .select('*').eq('user_id', id).eq('active', true)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id, vehicleId: r.vehicle_id, name: r.name, email: r.email, phone: r.phone,
    contactPref: r.contact_pref, lastNotifiedPrice: r.last_notified_price,
    active: r.active, createdAt: r.created_at,
  }));
}

export async function deleteMyWatch(watchId: string): Promise<{ error?: string }> {
  const sb = getBrowserClient();
  if (!sb) return { error: 'Not available' };
  const { error } = await sb.from('vehicle_watches').delete().eq('id', watchId);
  return { error: error?.message };
}

// ── Submitted leads (test drives, video requests, etc.) ──

export async function listMyLeads(): Promise<Lead[]> {
  const sb = getBrowserClient();
  if (!sb) return [];
  const id = await uid(sb);
  if (!id) return [];
  const { data, error } = await sb.from('leads')
    .select('*').eq('user_id', id)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id, type: r.type, name: r.name, email: r.email, phone: r.phone,
    vehicleId: r.vehicle_id, payload: r.payload ?? {}, status: r.status, createdAt: r.created_at,
  }));
}

// ── CarFinder alerts ──

export async function listMyCarRequests(): Promise<CarRequest[]> {
  const sb = getBrowserClient();
  if (!sb) return [];
  const id = await uid(sb);
  if (!id) return [];
  const { data, error } = await sb.from('car_requests')
    .select('*').eq('user_id', id)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id, name: r.name, email: r.email, phone: r.phone,
    contactPref: r.contact_pref, body: r.body, make: r.make, model: r.model,
    yearMin: r.year_min, priceMax: r.price_max, mileageMax: r.mileage_max,
    fuel: r.fuel, drive: r.drive, notes: r.notes, active: r.active,
    notifiedVehicleIds: Array.isArray(r.notified_vehicle_ids) ? r.notified_vehicle_ids : [],
    createdAt: r.created_at,
  }));
}

export async function setMyCarRequestActive(id: string, active: boolean): Promise<{ error?: string }> {
  const sb = getBrowserClient();
  if (!sb) return { error: 'Not available' };
  const { error } = await sb.from('car_requests').update({ active }).eq('id', id);
  return { error: error?.message };
}

export async function deleteMyCarRequest(id: string): Promise<{ error?: string }> {
  const sb = getBrowserClient();
  if (!sb) return { error: 'Not available' };
  const { error } = await sb.from('car_requests').delete().eq('id', id);
  return { error: error?.message };
}

// ── Profile ──

export type GarageProfile = {
  name: string;
  phone: string;
  contactPref: 'email' | 'sms';
  digestOptOut: boolean;
};

export async function getMyProfile(): Promise<GarageProfile | null> {
  const sb = getBrowserClient();
  if (!sb) return null;
  const id = await uid(sb);
  if (!id) return null;
  const { data } = await sb.from('profiles').select('name, phone, contact_pref, digest_opt_out').eq('id', id).maybeSingle();
  if (!data) return { name: '', phone: '', contactPref: 'email', digestOptOut: false };
  return { name: data.name ?? '', phone: data.phone ?? '', contactPref: data.contact_pref ?? 'email', digestOptOut: !!data.digest_opt_out };
}

export async function saveMyProfile(p: GarageProfile): Promise<{ error?: string }> {
  const sb = getBrowserClient();
  if (!sb) return { error: 'Not available' };
  const id = await uid(sb);
  if (!id) return { error: 'Not signed in' };
  // Upsert self-heals accounts that predate the profiles trigger.
  const { error } = await sb.from('profiles').upsert({
    id, name: p.name, phone: p.phone, contact_pref: p.contactPref,
    digest_opt_out: p.digestOptOut,
    updated_at: new Date().toISOString(),
  });
  return { error: error?.message };
}
