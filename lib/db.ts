import { getBrowserClient } from './supabase/client';
import { isSupabaseConfigured } from './supabase/config';
import { INVENTORY, Vehicle } from '@/data/inventory';
import { GUIDES, Guide } from '@/data/guides';
import { DEFAULT_HERO, HeroConfig } from '@/data/heroConfig';

// ───────────────────────── Types ─────────────────────────

export type SiteSettings = HeroConfig & {
  contactAddress: string;
  contactPhone: string;
  contactEmail: string;
  hours: { day: string; time: string }[];
};

export type Lead = {
  id: string;
  type: 'contact' | 'testdrive' | 'tradein' | 'finance' | 'video' | 'delivery' | 'other';
  name?: string;
  email?: string;
  phone?: string;
  vehicleId?: string | null;
  payload: Record<string, any>;
  status: 'new' | 'contacted' | 'closed';
  createdAt: string;
};

// ───────────────────────── Mappers ─────────────────────────

function rowToVehicle(r: any): AdminVehicle {
  return {
    id: r.id,
    year: r.year,
    make: r.make,
    model: r.model,
    price: r.price,
    mileage: r.mileage,
    body: r.body,
    fuel: r.fuel,
    drive: r.drive,
    exterior: r.exterior,
    interior: r.interior,
    aiSummary: r.ai_summary ?? '',
    images: Array.isArray(r.images) ? r.images : [],
    status: r.status,
    featured: r.featured,
    views: r.views ?? 0,
    hiddenOverride: r.hidden_override ?? false,
    createdAt: r.created_at,
  };
}

// Deliberately omits views / hidden_override / created_at: upserts (admin save,
// sheet sync) must never reset counters, the hide flag, or the arrival date.
export function vehicleToRow(v: Partial<Vehicle> & { images?: string[]; status?: string; featured?: boolean }) {
  return {
    id: v.id,
    year: v.year,
    make: v.make,
    model: v.model,
    price: v.price,
    mileage: v.mileage,
    body: v.body,
    fuel: v.fuel,
    drive: v.drive,
    exterior: v.exterior ?? '',
    interior: v.interior ?? '',
    ai_summary: v.aiSummary ?? '',
    images: v.images ?? [],
    status: v.status ?? 'available',
    featured: v.featured ?? false,
    updated_at: new Date().toISOString(),
  };
}

function rowToGuide(r: any): Guide & { id?: string; published?: boolean } {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    category: r.category,
    excerpt: r.excerpt ?? '',
    readMins: r.read_mins ?? 4,
    body: Array.isArray(r.body) ? r.body : [],
    matchQuery: r.match_query ?? '',
    published: r.published,
  };
}

export function guideToRow(g: Partial<Guide> & { published?: boolean }) {
  return {
    slug: g.slug,
    title: g.title,
    category: g.category,
    excerpt: g.excerpt ?? '',
    read_mins: g.readMins ?? 4,
    body: g.body ?? [],
    match_query: g.matchQuery ?? '',
    published: g.published ?? true,
    updated_at: new Date().toISOString(),
  };
}

// ───────────────────────── Vehicles ─────────────────────────

export type AdminVehicle = Vehicle & {
  images?: string[];
  status?: string;
  featured?: boolean;
  views?: number;
  // Admin "never show on site" flag. Lives only in the DB — the sheet sync
  // never writes it, so it survives daily imports.
  hiddenOverride?: boolean;
  createdAt?: string;
};

export async function listVehicles(opts?: { includeHidden?: boolean }): Promise<AdminVehicle[]> {
  const sb = getBrowserClient();
  if (!sb) return INVENTORY as AdminVehicle[];
  let q = sb.from('vehicles').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false });
  if (!opts?.includeHidden) q = q.neq('status', 'hidden');
  const { data, error } = await q;
  if (error || !data) return INVENTORY as AdminVehicle[];
  if (data.length === 0) return INVENTORY as AdminVehicle[];
  const mapped = data.map(rowToVehicle);
  // Filter the admin hide-override in JS so this works before the migration runs.
  return opts?.includeHidden ? mapped : mapped.filter(v => !v.hiddenOverride);
}

// Toggle the persistent hide flag (separate from upserts so syncs can't reset it).
export async function setVehicleHidden(id: string, hidden: boolean): Promise<{ error?: string }> {
  const sb = getBrowserClient();
  if (!sb) return { error: 'Supabase not configured' };
  const { error } = await sb.from('vehicles').update({ hidden_override: hidden }).eq('id', id);
  return { error: error?.message };
}

// Fire-and-forget VDP view counter.
export async function recordVehicleView(id: string): Promise<void> {
  const sb = getBrowserClient();
  if (!sb) return;
  try { await sb.rpc('increment_vehicle_view', { vid: id }); } catch { /* non-critical */ }
}

export type PricePoint = { price: number; recordedAt: string };

// All price-change rows (for the analytics dashboard).
export async function getAllPriceHistory(): Promise<Array<PricePoint & { vehicleId: string }>> {
  const sb = getBrowserClient();
  if (!sb) return [];
  const { data, error } = await sb.from('price_history')
    .select('vehicle_id, price, recorded_at')
    .order('recorded_at', { ascending: true });
  if (error || !data) return [];
  return data.map((r: any) => ({ vehicleId: r.vehicle_id, price: r.price, recordedAt: r.recorded_at }));
}

export async function getPriceHistory(vehicleId: string): Promise<PricePoint[]> {
  const sb = getBrowserClient();
  if (!sb) return [];
  const { data, error } = await sb.from('price_history')
    .select('price, recorded_at')
    .eq('vehicle_id', vehicleId)
    .order('recorded_at', { ascending: true });
  if (error || !data) return [];
  return data.map((r: any) => ({ price: r.price, recordedAt: r.recorded_at }));
}

export async function getVehicleById(id: string): Promise<AdminVehicle | null> {
  const sb = getBrowserClient();
  if (!sb) return (INVENTORY.find(v => v.id === id) as AdminVehicle) ?? null;
  const { data, error } = await sb.from('vehicles').select('*').eq('id', id).maybeSingle();
  if (error || !data) return (INVENTORY.find(v => v.id === id) as AdminVehicle) ?? null;
  return rowToVehicle(data);
}

export async function saveVehicle(v: AdminVehicle): Promise<{ error?: string }> {
  const sb = getBrowserClient();
  if (!sb) return { error: 'Supabase not configured' };
  const { error } = await sb.from('vehicles').upsert(vehicleToRow(v));
  return { error: error?.message };
}

export async function deleteVehicle(id: string): Promise<{ error?: string }> {
  const sb = getBrowserClient();
  if (!sb) return { error: 'Supabase not configured' };
  const { error } = await sb.from('vehicles').delete().eq('id', id);
  return { error: error?.message };
}

export async function importStarterVehicles(): Promise<{ error?: string; count?: number }> {
  const sb = getBrowserClient();
  if (!sb) return { error: 'Supabase not configured' };
  const rows = INVENTORY.map((v, i) => ({ ...vehicleToRow(v as AdminVehicle), sort_order: i }));
  const { error } = await sb.from('vehicles').upsert(rows);
  return { error: error?.message, count: rows.length };
}

// Pull inventory from the Google Sheet (via our API) and upsert into Supabase
// using the current admin session.
export async function syncFromSheet(): Promise<{ error?: string; count?: number; warnings?: string[] }> {
  const sb = getBrowserClient();
  if (!sb) return { error: 'Supabase not configured' };
  let payload: any;
  try {
    const res = await fetch('/api/sheet-inventory', { cache: 'no-store' });
    payload = await res.json();
    if (!res.ok) return { error: payload?.error || `Sheet read failed (${res.status})` };
  } catch (e: any) {
    return { error: e?.message || 'Failed to reach the sheet' };
  }
  const vehicles: AdminVehicle[] = payload.vehicles || [];
  if (vehicles.length === 0) return { error: (payload.warnings || []).join(' ') || 'No vehicles found in the sheet.' };

  // De-dupe by id (sheet can contain accidental duplicates).
  const byId = new Map<string, AdminVehicle>();
  vehicles.forEach(v => byId.set(v.id, v));
  const unique = Array.from(byId.values());

  const rows = unique.map((v, i) => ({ ...vehicleToRow(v), sort_order: i }));
  const { error } = await sb.from('vehicles').upsert(rows);
  if (error) return { error: error.message };

  // Mirror the sheet: remove listings that are no longer in it.
  let removed = 0;
  const { data: existing } = await sb.from('vehicles').select('id');
  if (existing) {
    const keep = new Set(rows.map(r => r.id));
    const stale = existing.map((e: any) => e.id).filter((id: string) => !keep.has(id));
    if (stale.length) {
      const { error: delErr } = await sb.from('vehicles').delete().in('id', stale);
      if (!delErr) removed = stale.length;
    }
  }
  const warnings = [...(payload.warnings || [])];
  if (removed) warnings.push(`Removed ${removed} listing(s) no longer in the sheet.`);
  return { count: rows.length, warnings };
}

// ───────────────────────── Settings ─────────────────────────

export async function getSettings(): Promise<SiteSettings> {
  const fallback: SiteSettings = {
    ...DEFAULT_HERO,
    contactAddress: '550 Windmill Rd, Dartmouth, NS B3B 1B3',
    contactPhone: '(555) 234-9090',
    contactEmail: 'hello@carsonexports.com',
    hours: [
      { day: 'Mon–Fri', time: '9 AM–7 PM' },
      { day: 'Saturday', time: '10 AM–6 PM' },
      { day: 'Sunday', time: '11 AM–5 PM' },
    ],
  };
  const sb = getBrowserClient();
  if (!sb) return fallback;
  const { data, error } = await sb.from('site_settings').select('*').eq('id', 1).maybeSingle();
  if (error || !data) return fallback;
  return {
    mode: data.hero_mode,
    videoUrl: data.hero_video_url,
    imageUrl: data.hero_image_url,
    headline: data.hero_headline,
    subtext: data.hero_subtext,
    showOverlay: data.hero_show_overlay ?? true,
    linkUrl: data.hero_link_url ?? '',
    contactAddress: data.contact_address,
    contactPhone: data.contact_phone,
    contactEmail: data.contact_email,
    hours: Array.isArray(data.hours) ? data.hours : fallback.hours,
  };
}

export async function saveSettings(s: SiteSettings): Promise<{ error?: string }> {
  const sb = getBrowserClient();
  if (!sb) return { error: 'Supabase not configured' };
  const { error } = await sb.from('site_settings').update({
    hero_mode: s.mode,
    hero_video_url: s.videoUrl,
    hero_image_url: s.imageUrl,
    hero_headline: s.headline,
    hero_subtext: s.subtext,
    hero_show_overlay: s.showOverlay,
    hero_link_url: s.linkUrl,
    contact_address: s.contactAddress,
    contact_phone: s.contactPhone,
    contact_email: s.contactEmail,
    hours: s.hours,
    updated_at: new Date().toISOString(),
  }).eq('id', 1);
  return { error: error?.message };
}

// ───────────────────────── Leads ─────────────────────────

export async function createLead(lead: Omit<Lead, 'id' | 'status' | 'createdAt'>): Promise<{ error?: string }> {
  const sb = getBrowserClient();
  if (!sb) return {}; // silently no-op if not configured (forms still "work")
  const { error } = await sb.from('leads').insert({
    type: lead.type,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    vehicle_id: lead.vehicleId ?? null,
    payload: lead.payload ?? {},
  });
  return { error: error?.message };
}

export async function listLeads(): Promise<Lead[]> {
  const sb = getBrowserClient();
  if (!sb) return [];
  const { data, error } = await sb.from('leads').select('*').order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id, type: r.type, name: r.name, email: r.email, phone: r.phone,
    vehicleId: r.vehicle_id, payload: r.payload ?? {}, status: r.status, createdAt: r.created_at,
  }));
}

export async function updateLeadStatus(id: string, status: Lead['status']): Promise<{ error?: string }> {
  const sb = getBrowserClient();
  if (!sb) return { error: 'Supabase not configured' };
  const { error } = await sb.from('leads').update({ status }).eq('id', id);
  return { error: error?.message };
}

// ───────────────────────── Guides ─────────────────────────

export type AdminGuide = Guide & { id?: string; published?: boolean };

export async function listGuides(opts?: { includeUnpublished?: boolean }): Promise<AdminGuide[]> {
  const sb = getBrowserClient();
  if (!sb) return GUIDES as AdminGuide[];
  let q = sb.from('guides').select('*').order('sort_order', { ascending: true });
  if (!opts?.includeUnpublished) q = q.eq('published', true);
  const { data, error } = await q;
  if (error || !data || data.length === 0) return GUIDES as AdminGuide[];
  return data.map(rowToGuide);
}

export async function getGuideBySlug(slug: string): Promise<AdminGuide | null> {
  const sb = getBrowserClient();
  if (!sb) return (GUIDES.find(g => g.slug === slug) as AdminGuide) ?? null;
  const { data, error } = await sb.from('guides').select('*').eq('slug', slug).maybeSingle();
  if (error || !data) return (GUIDES.find(g => g.slug === slug) as AdminGuide) ?? null;
  return rowToGuide(data);
}

export async function saveGuide(g: AdminGuide): Promise<{ error?: string }> {
  const sb = getBrowserClient();
  if (!sb) return { error: 'Supabase not configured' };
  const { error } = await sb.from('guides').upsert(guideToRow(g), { onConflict: 'slug' });
  return { error: error?.message };
}

export async function deleteGuide(slug: string): Promise<{ error?: string }> {
  const sb = getBrowserClient();
  if (!sb) return { error: 'Supabase not configured' };
  const { error } = await sb.from('guides').delete().eq('slug', slug);
  return { error: error?.message };
}

export async function importStarterGuides(): Promise<{ error?: string; count?: number }> {
  const sb = getBrowserClient();
  if (!sb) return { error: 'Supabase not configured' };
  const rows = GUIDES.map((g, i) => ({ ...guideToRow(g as AdminGuide), sort_order: i }));
  const { error } = await sb.from('guides').upsert(rows, { onConflict: 'slug' });
  return { error: error?.message, count: rows.length };
}

// ───────────────────────── Navigation ─────────────────────────

export type NavChild = { id?: string; label: string; href: string; sortOrder?: number };
export type NavItem = {
  id?: string;
  label: string;
  href: string;
  sortOrder?: number;
  autoCategories?: boolean;
  children?: NavChild[];
};

// Default menu used when Supabase has no nav rows (or isn't configured).
export const DEFAULT_NAV: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Inventory', href: '/inventory', autoCategories: true },
  { label: 'Find Your Car', href: '/inventory-search' },
  { label: 'AI Finder', href: '/finder' },
  { label: 'Trade-in', href: '/tradein' },
  { label: 'Financing', href: '/finance', children: [
    { label: 'Financing Options', href: '/finance' },
    { label: 'Ask AI', href: '/financing-explainer' },
  ] },
  { label: 'Guides', href: '/guides' },
  { label: 'About', href: '/about', children: [
    { label: 'About Carson', href: '/about' },
    { label: 'Meet the Team', href: '/team' },
    { label: 'Reviews', href: '/testimonials' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Contact', href: '/contact' },
  ] },
];

export async function listNav(): Promise<NavItem[]> {
  const sb = getBrowserClient();
  if (!sb) return DEFAULT_NAV;
  const { data, error } = await sb.from('nav_items').select('*').order('sort_order', { ascending: true });
  if (error || !data || data.length === 0) return DEFAULT_NAV;
  const tops = data.filter((r: any) => !r.parent_id);
  return tops.map((t: any) => ({
    id: t.id, label: t.label, href: t.href, sortOrder: t.sort_order, autoCategories: t.auto_categories,
    children: data.filter((c: any) => c.parent_id === t.id)
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((c: any) => ({ id: c.id, label: c.label, href: c.href, sortOrder: c.sort_order })),
  }));
}

// Replace the whole nav (simplest reliable save): delete all, re-insert.
export async function saveNav(items: NavItem[]): Promise<{ error?: string }> {
  const sb = getBrowserClient();
  if (!sb) return { error: 'Supabase not configured' };
  const del = await sb.from('nav_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (del.error) return { error: del.error.message };
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const { data, error } = await sb.from('nav_items')
      .insert({ label: it.label, href: it.href, sort_order: i, auto_categories: !!it.autoCategories })
      .select('id').single();
    if (error) return { error: error.message };
    const parentId = data!.id;
    const kids = it.children || [];
    for (let j = 0; j < kids.length; j++) {
      const { error: cErr } = await sb.from('nav_items')
        .insert({ label: kids[j].label, href: kids[j].href, parent_id: parentId, sort_order: j });
      if (cErr) return { error: cErr.message };
    }
  }
  return {};
}

export async function seedDefaultNav(): Promise<{ error?: string }> {
  return saveNav(DEFAULT_NAV);
}

// ───────────────────────── Team ─────────────────────────

export type TeamMember = {
  id?: string;
  slug: string;
  name: string;
  role: string;
  photoUrl: string;
  videoUrl: string;
  bio: string;
  funFacts: string[];
  specialties: string[];
  email: string;
  phone: string;
  active: boolean;
  sortOrder?: number;
};

// Shown until real members are added (or when Supabase is unconfigured).
export const SAMPLE_TEAM: TeamMember[] = [
  {
    slug: 'sample-team-member',
    name: 'Your Name Here',
    role: 'Sales Specialist',
    photoUrl: '', videoUrl: '',
    bio: 'This is a sample profile. Add your real team in Admin → Team — each member gets their own page with a photo, intro video, bio, and fun facts.',
    funFacts: ['Add fun facts in the admin', 'Each person gets their own page', 'Videos welcome'],
    specialties: ['Customer care'],
    email: '', phone: '', active: true,
  },
];

function rowToMember(r: any): TeamMember {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    role: r.role ?? '',
    photoUrl: r.photo_url ?? '',
    videoUrl: r.video_url ?? '',
    bio: r.bio ?? '',
    funFacts: Array.isArray(r.fun_facts) ? r.fun_facts : [],
    specialties: Array.isArray(r.specialties) ? r.specialties : [],
    email: r.email ?? '',
    phone: r.phone ?? '',
    active: r.active ?? true,
    sortOrder: r.sort_order ?? 0,
  };
}

function memberToRow(m: TeamMember) {
  return {
    slug: m.slug,
    name: m.name,
    role: m.role ?? '',
    photo_url: m.photoUrl ?? '',
    video_url: m.videoUrl ?? '',
    bio: m.bio ?? '',
    fun_facts: m.funFacts ?? [],
    specialties: m.specialties ?? [],
    email: m.email ?? '',
    phone: m.phone ?? '',
    active: m.active ?? true,
    sort_order: m.sortOrder ?? 0,
  };
}

export async function listTeam(opts?: { includeInactive?: boolean }): Promise<TeamMember[]> {
  const sb = getBrowserClient();
  if (!sb) return SAMPLE_TEAM;
  let q = sb.from('team_members').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true });
  if (!opts?.includeInactive) q = q.eq('active', true);
  const { data, error } = await q;
  if (error || !data || data.length === 0) return opts?.includeInactive && data ? [] : SAMPLE_TEAM;
  return data.map(rowToMember);
}

export async function getTeamMemberBySlug(slug: string): Promise<TeamMember | null> {
  const sb = getBrowserClient();
  if (!sb) return SAMPLE_TEAM.find(m => m.slug === slug) ?? null;
  const { data, error } = await sb.from('team_members').select('*').eq('slug', slug).maybeSingle();
  if (error || !data) return SAMPLE_TEAM.find(m => m.slug === slug) ?? null;
  return rowToMember(data);
}

export async function saveTeamMember(m: TeamMember): Promise<{ error?: string }> {
  const sb = getBrowserClient();
  if (!sb) return { error: 'Supabase not configured' };
  const { error } = await sb.from('team_members').upsert(memberToRow(m), { onConflict: 'slug' });
  return { error: error?.message };
}

export async function deleteTeamMember(slug: string): Promise<{ error?: string }> {
  const sb = getBrowserClient();
  if (!sb) return { error: 'Supabase not configured' };
  const { error } = await sb.from('team_members').delete().eq('slug', slug);
  return { error: error?.message };
}

export async function reorderTeam(slugs: string[]): Promise<{ error?: string }> {
  const sb = getBrowserClient();
  if (!sb) return { error: 'Supabase not configured' };
  for (let i = 0; i < slugs.length; i++) {
    const { error } = await sb.from('team_members').update({ sort_order: i }).eq('slug', slugs[i]);
    if (error) return { error: error.message };
  }
  return {};
}

// ───────────────────────── Image upload (Storage) ─────────────────────────

export async function uploadImage(file: File): Promise<{ url?: string; error?: string }> {
  const sb = getBrowserClient();
  if (!sb) return { error: 'Supabase not configured' };
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `vehicles/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await sb.storage.from('media').upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) return { error: error.message };
  const { data } = sb.storage.from('media').getPublicUrl(path);
  return { url: data.publicUrl };
}

// ───────────────────────── AI Knowledge Base ─────────────────────────

export type KnowledgeEntry = {
  id?: string;
  category: 'about_carson' | 'inventory_insights' | 'market_data' | 'policies' | 'team' | 'promotions';
  title: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function listKnowledgeBase(category?: string): Promise<KnowledgeEntry[]> {
  const sb = getBrowserClient();
  if (!sb) return [];
  let query = sb.from('ai_knowledge_base').select('*');
  if (category) query = query.eq('category', category);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    category: r.category,
    title: r.title,
    content: r.content,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function saveKnowledgeEntry(entry: KnowledgeEntry): Promise<{ error?: string }> {
  const sb = getBrowserClient();
  if (!sb) return { error: 'Supabase not configured' };
  if (!entry.title || !entry.content) return { error: 'Title and content required' };

  if (entry.id) {
    const { error } = await sb.from('ai_knowledge_base').update({
      title: entry.title,
      content: entry.content,
      updated_at: new Date().toISOString(),
    }).eq('id', entry.id);
    return { error: error?.message };
  } else {
    const { error } = await sb.from('ai_knowledge_base').insert({
      category: entry.category,
      title: entry.title,
      content: entry.content,
    });
    return { error: error?.message };
  }
}

export async function deleteKnowledgeEntry(id: string): Promise<{ error?: string }> {
  const sb = getBrowserClient();
  if (!sb) return { error: 'Supabase not configured' };
  const { error } = await sb.from('ai_knowledge_base').delete().eq('id', id);
  return { error: error?.message };
}

export async function getKnowledgeBaseContext(): Promise<string> {
  const entries = await listKnowledgeBase();
  if (entries.length === 0) return '';

  const grouped: Record<string, KnowledgeEntry[]> = {};
  entries.forEach(e => {
    if (!grouped[e.category]) grouped[e.category] = [];
    grouped[e.category].push(e);
  });

  let context = '# Carson Exports Knowledge Base\n\n';
  Object.entries(grouped).forEach(([cat, items]) => {
    const catLabel = cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    context += `## ${catLabel}\n`;
    items.forEach(item => {
      context += `### ${item.title}\n${item.content}\n\n`;
    });
  });
  return context;
}

export { isSupabaseConfigured };
