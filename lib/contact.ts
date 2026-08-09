// The original schema seeded site_settings.contact_phone with a fictional
// 555 number (supabase/schema.sql). Until the dealership sets a real one in
// Admin → Settings, every surface must treat it as "not set" and simply omit
// the number — a fake phone in the footer, in AI replies, or in the AutoDealer
// JSON-LD is worse than none at all.
const SEED_PHONE_DIGITS = '5552349090';

export function realPhone(value?: string | null): string {
  const v = (value || '').trim();
  if (!v) return '';
  return v.replace(/\D/g, '').replace(/^1/, '') === SEED_PHONE_DIGITS ? '' : v;
}
