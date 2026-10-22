import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase/config';
import { mapLegacyPath } from './legacyUrls';
import { fetchVehicles } from './serverDb';
import { allLocalSearches } from './localSearch';

// 301 for an old carsonexports.com (SM360) URL — used by app/en and app/fr.
// Looks up only what the path needs: the vehicle by SM360 id, the article by
// its old id, and which /used make pages exist. Campaign params (utm_*, gclid…)
// are carried over so tracked links keep attributing.
export async function legacyRedirect(req: Request, segments: string[] | undefined, lang: 'en' | 'fr') {
  const path = `/${lang}/${(segments || []).join('/')}`;
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const vehicleSm360Id = path.match(/-id(\d+)\/?$/)?.[1];
  const articleSm360Id = path.match(/\/news\/view\/[^/]+\/(\d+)/)?.[1];

  const [vehicle, article, vehicles] = await Promise.all([
    vehicleSm360Id ? sb.from('vehicles').select('id').eq('source_id', vehicleSm360Id).maybeSingle().then(r => r.data) : null,
    articleSm360Id ? sb.from('articles').select('slug').eq('legacy_id', articleSm360Id).maybeSingle().then(r => r.data) : null,
    /\/(used-inventory|used-suv-inventory)\//.test(path) ? fetchVehicles() : Promise.resolve([]),
  ]);

  const dest = mapLegacyPath(path, {
    vehicleIdBySourceId: () => vehicle?.id,
    articleSlugByLegacyId: () => article?.slug,
    makePages: new Set(allLocalSearches(vehicles).filter(p => p.kind === 'make').map(p => p.slug)),
  });

  // On Netlify req.url is the internal deploy URL (…--carsonsite.netlify.app), so
  // build the target on the host the visitor actually asked for.
  const from = new URL(req.url);
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const proto = (req.headers.get('x-forwarded-proto') || from.protocol.replace(':', '')).split(',')[0];
  const to = new URL(dest, host ? `${proto}://${host}` : from);
  from.searchParams.forEach((v, k) => { if (/^(utm_|gclid|gbraid|wbraid|fbclid|msclkid)/i.test(k)) to.searchParams.set(k, v); });
  return Response.redirect(to, 301);
}
