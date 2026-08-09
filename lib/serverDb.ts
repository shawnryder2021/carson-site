// Server-side Supabase reads (no auth cookies) for generateMetadata,
// sitemap, and JSON-LD. Never throws — returns null/[] on any failure.
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from './supabase/config';
import { realPhone } from './contact';
import { INVENTORY } from '@/data/inventory';
import { GUIDES } from '@/data/guides';

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || 'https://carsonsite.netlify.app';

function client() {
  if (!isSupabaseConfigured) return null;
  try {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  } catch {
    return null;
  }
}

export type ServerVehicle = {
  id: string; year: number; make: string; model: string; price: number; mileage: number;
  body: string; fuel: string; drive: string; exterior: string; interior: string;
  aiSummary: string; images: string[]; status: string;
};

export async function fetchVehicles(): Promise<ServerVehicle[]> {
  const sb = client();
  if (!sb) return INVENTORY.map(v => ({ ...v, images: [], status: 'available' }));
  try {
    const { data, error } = await sb.from('vehicles').select('*').neq('status', 'hidden');
    if (error || !data || data.length === 0) return INVENTORY.map(v => ({ ...v, images: [], status: 'available' }));
    return data
      .filter((r: any) => !r.hidden_override)
      .map((r: any) => ({
        id: r.id, year: r.year, make: r.make, model: r.model, price: r.price, mileage: r.mileage,
        body: r.body, fuel: r.fuel, drive: r.drive, exterior: r.exterior ?? '', interior: r.interior ?? '',
        aiSummary: r.ai_summary ?? '', images: Array.isArray(r.images) ? r.images : [], status: r.status ?? 'available',
      }));
  } catch {
    return INVENTORY.map(v => ({ ...v, images: [], status: 'available' }));
  }
}

export async function fetchVehicle(id: string): Promise<ServerVehicle | null> {
  const sb = client();
  const fallback = () => {
    const v = INVENTORY.find(x => x.id === id);
    return v ? { ...v, images: [], status: 'available' } : null;
  };
  if (!sb) return fallback();
  try {
    const { data, error } = await sb.from('vehicles').select('*').eq('id', id).maybeSingle();
    if (error || !data || data.hidden_override) return error || !data ? fallback() : null;
    return {
      id: data.id, year: data.year, make: data.make, model: data.model, price: data.price, mileage: data.mileage,
      body: data.body, fuel: data.fuel, drive: data.drive, exterior: data.exterior ?? '', interior: data.interior ?? '',
      aiSummary: data.ai_summary ?? '', images: Array.isArray(data.images) ? data.images : [], status: data.status ?? 'available',
    };
  } catch {
    return fallback();
  }
}

export type ServerGuide = { slug: string; title: string; category: string; excerpt: string };

export async function fetchGuides(): Promise<ServerGuide[]> {
  const sb = client();
  if (!sb) return GUIDES.map(g => ({ slug: g.slug, title: g.title, category: g.category, excerpt: g.excerpt }));
  try {
    const { data, error } = await sb.from('guides').select('slug,title,category,excerpt').eq('published', true);
    if (error || !data || data.length === 0) return GUIDES.map(g => ({ slug: g.slug, title: g.title, category: g.category, excerpt: g.excerpt }));
    return data;
  } catch {
    return GUIDES.map(g => ({ slug: g.slug, title: g.title, category: g.category, excerpt: g.excerpt }));
  }
}

export async function fetchGuide(slug: string): Promise<ServerGuide | null> {
  const all = await fetchGuides();
  return all.find(g => g.slug === slug) ?? null;
}

export type ServerTeamMember = { slug: string; name: string; role: string; bio: string; photoUrl: string };

export async function fetchTeam(): Promise<ServerTeamMember[]> {
  const sb = client();
  if (!sb) return [];
  try {
    const { data, error } = await sb.from('team_members').select('slug,name,role,bio,photo_url').eq('active', true);
    if (error || !data) return [];
    return data.map((r: any) => ({ slug: r.slug, name: r.name, role: r.role ?? '', bio: r.bio ?? '', photoUrl: r.photo_url ?? '' }));
  } catch {
    return [];
  }
}

export async function fetchTeamMember(slug: string): Promise<ServerTeamMember | null> {
  const all = await fetchTeam();
  return all.find(m => m.slug === slug) ?? null;
}

export type ServerPage = { slug: string; title: string; description: string };
export type ServerPageFull = ServerPage & { ogImage: string; blocks: any[] };

export async function fetchPages(): Promise<ServerPage[]> {
  const sb = client();
  if (!sb) return [];
  try {
    const { data, error } = await sb.from('pages').select('slug,title,description').eq('published', true);
    if (error || !data) return [];
    return data.map((r: any) => ({ slug: r.slug, title: r.title, description: r.description ?? '' }));
  } catch {
    return [];
  }
}

export async function fetchPage(slug: string): Promise<ServerPage | null> {
  const all = await fetchPages();
  return all.find(p => p.slug === slug) ?? null;
}

export type ServerSettings = { contactPhone: string; contactEmail: string; contactAddress: string };

// Contact details for server-rendered surfaces (JSON-LD, policy pages). Empty
// strings when unset — callers must omit the field rather than invent one.
export async function fetchSettings(): Promise<ServerSettings> {
  const empty: ServerSettings = { contactPhone: '', contactEmail: '', contactAddress: '' };
  if (!isSupabaseConfigured) return empty;
  let sb;
  try {
    // The root layout awaits this, so without a revalidate hint the value would
    // be frozen into every statically-rendered page at build time. Scoped to
    // this client so the shared client() caching behaviour is untouched.
    sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      global: {
        fetch: (input: any, init?: any) =>
          fetch(input, { ...init, next: { revalidate: 600 } } as any),
      },
    });
  } catch {
    return empty;
  }
  try {
    const { data, error } = await sb.from('site_settings')
      .select('contact_phone, contact_email, contact_address').eq('id', 1).maybeSingle();
    if (error || !data) return empty;
    return {
      contactPhone: realPhone(data.contact_phone),
      contactEmail: data.contact_email ?? '',
      contactAddress: data.contact_address ?? '',
    };
  } catch {
    return empty;
  }
}

export async function fetchPageFull(slug: string): Promise<ServerPageFull | null> {
  const sb = client();
  if (!sb) return null;
  try {
    const { data, error } = await sb.from('pages').select('slug,title,description,blocks').eq('slug', slug).eq('published', true).maybeSingle();
    if (error || !data) return null;
    const rawBlocks: any[] = Array.isArray(data.blocks) ? data.blocks : [];
    const meta = rawBlocks.find((b: any) => b.type === '_meta') ?? {};
    const blocks = rawBlocks.filter((b: any) => b.type !== '_meta');
    return { slug: data.slug, title: data.title, description: data.description ?? '', ogImage: meta.ogImage ?? '', blocks };
  } catch {
    return null;
  }
}
