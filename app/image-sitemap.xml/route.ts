import { SITE_URL, fetchVehicles, fetchArticles } from '@/lib/serverDb';
import { displayTrim } from '@/lib/sm360';

// Image sitemap (Google's image extension) for vehicle photos and article
// images, so they're found and indexed for Google Images. Listed in robots.txt
// next to /sitemap.xml (Next's sitemap type here has no image support).
export const revalidate = 3600;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export async function GET() {
  const [vehicles, articles] = await Promise.all([fetchVehicles(), fetchArticles()]);
  const entries: string[] = [];

  for (const v of vehicles) {
    const photos = (v.images || []).filter((i: any) => typeof i === 'string' && /^https?:\/\//.test(i)).slice(0, 20) as string[];
    if (!photos.length) continue;
    const name = [v.year, v.make, v.model, displayTrim(v.trim)].filter(Boolean).join(' ');
    entries.push(`<url><loc>${esc(`${SITE_URL}/vehicle/${v.id}`)}</loc>${photos
      .map((p, i) => `<image:image><image:loc>${esc(p)}</image:loc><image:title>${esc(`${name}, photo ${i + 1}`)}</image:title></image:image>`)
      .join('')}</url>`);
  }
  for (const a of articles) {
    if (!a.image) continue;
    entries.push(`<url><loc>${esc(`${SITE_URL}/news/${a.slug}`)}</loc><image:image><image:loc>${esc(a.image)}</image:loc><image:title>${esc(a.title)}</image:title></image:image></url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries.join('\n')}
</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
